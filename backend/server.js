هذا كود server.js — انسخه والصقه 👇
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
    }
});

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'social_media_platform',
    waitForConnections: true,
    connectionLimit: 10
});

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'غير مصرح به' });
    jwt.verify(token, process.env.JWT_SECRET || 'secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'انتهت الجلسة' });
        req.user = user;
        next();
    });
};

// تسجيل مستخدم جديد
app.post('/api/auth/register', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { username, email, password, full_name } = req.body;
        const [existing] = await connection.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'البريد أو اسم المستخدم موجود مسبقاً' });
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await connection.execute(
            'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, full_name]
        );
        const token = jwt.sign(
            { id: result.insertId, username, email },
            process.env.JWT_SECRET || 'secret-key',
            { expiresIn: '30d' }
        );
        res.status(201).json({ token, user: { id: result.insertId, username, email, full_name } });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ في الخادم' });
    } finally {
        connection.release();
    }
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { email, password } = req.body;
        const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: 'بيانات غير صحيحة' });
        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'بيانات غير صحيحة' });
        await connection.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET || 'secret-key',
            { expiresIn: '30d' }
        );
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, profile_picture: user.profile_picture } });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ في الخادم' });
    } finally {
        connection.release();
    }
});

// التحقق من token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [users] = await connection.execute('SELECT id, username, email, full_name, profile_picture FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
        res.json({ user: users[0] });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// إنشاء منشور
app.post('/api/posts', authenticateToken, upload.single('media'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { content, visibility } = req.body;
        let mediaUrl = null, type = 'text';
        if (req.file) {
            mediaUrl = `/uploads/${req.file.filename}`;
            type = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
        }
        const [result] = await connection.execute(
            'INSERT INTO posts (user_id, content, type, media_url, visibility) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, content, type, mediaUrl, visibility || 'public']
        );
        const [posts] = await connection.execute(
            'SELECT p.*, u.username, u.full_name, u.profile_picture FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
            [result.insertId]
        );
        res.status(201).json(posts[0]);
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// جلب الفيد
app.get('/api/feed', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const userId = req.user.id;
        const [posts] = await connection.execute(
            `SELECT p.*, u.username, u.full_name, u.profile_picture,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
             FROM posts p JOIN users u ON p.user_id = u.id
             WHERE p.visibility = 'public' OR p.user_id = ?
             ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [userId, userId, parseInt(limit), offset]
        );
        res.json({ posts, hasMore: posts.length === parseInt(limit), page: parseInt(page) });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// إعجاب
app.post('/api/posts/:postId/like', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [existing] = await connection.execute(
            'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
            [req.user.id, req.params.postId]
        );
        if (existing.length > 0) {
            await connection.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, req.params.postId]);
        } else {
            await connection.execute('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.user.id, req.params.postId]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// جلب المستخدم
app.get('/api/users/:userId', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [users] = await connection.execute(
            'SELECT id, username, full_name, bio, profile_picture, cover_photo, is_verified FROM users WHERE id = ?',
            [req.params.userId]
        );
        if (users.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
        res.json({ user: users[0], friendStatus: null });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// منشورات مستخدم
app.get('/api/users/:userId/posts', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [posts] = await connection.execute(
            'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC',
            [req.params.userId]
        );
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// طلب صداقة
app.post('/api/friends/request/:userId', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.execute(
            'INSERT INTO friendships (user_id, friend_id, status, action_user_id) VALUES (?, ?, "pending", ?)',
            [req.user.id, req.params.userId, req.user.id]
        );
        res.json({ message: 'تم إرسال طلب الصداقة' });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// قبول صداقة
app.post('/api/friends/accept/:friendshipId', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.execute(
            'UPDATE friendships SET status = "accepted" WHERE id = ?',
            [req.params.friendshipId]
        );
        res.json({ message: 'تم قبول الصداقة' });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// جلب الأصدقاء
app.get('/api/friends', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [friends] = await connection.execute(
            `SELECT u.id, u.username, u.full_name, u.profile_picture FROM users u
             JOIN friendships f ON (f.friend_id = u.id OR f.user_id = u.id)
             WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted' AND u.id != ?`,
            [req.user.id, req.user.id, req.user.id]
        );
        res.json(friends);
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// طلبات الصداقة
app.get('/api/friends/requests', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [requests] = await connection.execute(
            `SELECT u.id, u.username, u.full_name, u.profile_picture, f.id as friendship_id
             FROM users u JOIN friendships f ON f.user_id = u.id
             WHERE f.friend_id = ? AND f.status = 'pending'`,
            [req.user.id]
        );
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// بحث مستخدمين
app.get('/api/users/search', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [users] = await connection.execute(
            'SELECT id, username, full_name, profile_picture FROM users WHERE username LIKE ? OR full_name LIKE ? LIMIT 10',
            [`%${req.query.q}%`, `%${req.query.q}%`]
        );
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// جلب المحادثات
app.get('/api/conversations', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [conversations] = await connection.execute(
            `SELECT c.*, u.full_name as name, u.profile_picture
             FROM conversations c
             JOIN conversation_participants cp ON c.id = cp.conversation_id
             JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != ?
             JOIN users u ON cp2.user_id = u.id
             WHERE cp.user_id = ? ORDER BY c.updated_at DESC`,
            [req.user.id, req.user.id]
        );
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// جلب رسائل محادثة
app.get('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [messages] = await connection.execute(
            `SELECT m.*, u.username, u.full_name, u.profile_picture
             FROM messages m JOIN users u ON m.sender_id = u.id
             WHERE m.conversation_id = ? ORDER BY m.created_at ASC`,
            [req.params.id]
        );
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    } finally {
        connection.release();
    }
});

// Socket.io
const onlineUsers = new Map();
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('غير مصرح به'));
    jwt.verify(token, process.env.JWT_SECRET || 'secret-key', (err, user) => {
        if (err) return next(new Error('انتهت الجلسة'));
        socket.user = user;
        next();
    });
});

io.on('connection', (socket) => {
    const userId = socket.user.id;
    onlineUsers.set(userId, socket.id);

    socket.on('send_message', async (data) => {
        try {
            const connection = await pool.getConnection();
            const [result] = await connection.execute(
                'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
                [data.conversationId, userId, data.content]
            );
            const [message] = await connection.execute(
                'SELECT m.*, u.username, u.full_name, u.profile_picture FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?',
                [result.insertId]
            );
            connection.release();
            io.to(`conversation_${data.conversationId}`).emit('new_message', message[0]);
        } catch (error) {
            console.error('Send message error:', error);
        }
    });

    socket.on('typing', (data) => {
        socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
            userId, isTyping: data.isTyping
        });
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
