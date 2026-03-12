require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if(!token) return res.status(401).json({ message: 'غير مصرح' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch(e) { res.status(401).json({ message: 'رمز غير صالح' }); }
};

// دالة إنشاء إشعار
async function createNotification(pool, userId, fromUserId, type, postId = null) {
  if(userId === fromUserId) return; // لا تشعر نفسك
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, from_user_id, type, post_id) VALUES ($1,$2,$3,$4)',
      [userId, fromUserId, type, postId]
    );
  } catch(e) { console.error('Notification error:', e.message); }
}

// ===== AUTH =====
app.post('/api/auth/register', async (req, res) => {
  const { username, email, full_name, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users(username,email,full_name,password) VALUES($1,$2,$3,$4) RETURNING id,username,email,full_name',
      [username, email, full_name, hashed]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if(!user) return res.status(400).json({ message: 'المستخدم غير موجود' });
    const match = await bcrypt.compare(password, user.password);
    if(!match) return res.status(400).json({ message: 'كلمة المرور خاطئة' });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id:user.id, username:user.username, email:user.email, full_name:user.full_name }, token });
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// ===== PROFILE =====
app.get('/api/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.bio, u.profile_picture,
      (SELECT COUNT(*) FROM follows WHERE follower_id=u.id) as following_count,
      (SELECT COUNT(*) FROM follows WHERE following_id=u.id) as followers_count,
      (SELECT COUNT(*) FROM posts WHERE user_id=u.id) as posts_count
      FROM users u WHERE u.id=$1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/profile', auth, async (req, res) => {
  const { full_name, bio, profile_picture } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET full_name=$1, bio=$2, profile_picture=$3 WHERE id=$4 RETURNING id, username, email, full_name, bio, profile_picture',
      [full_name, bio, profile_picture, req.user.id]
    );
    res.json(result.rows[0]);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// ===== POSTS =====
app.get('/api/posts', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username, u.full_name, u.profile_picture,
      (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id=p.id) as comments_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id=p.id AND user_id=$1) as liked
      FROM posts p JOIN users u ON p.user_id=u.id
      ORDER BY p.created_at DESC LIMIT 20
    `, [req.user.id]);
    res.json(result.rows);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/posts', auth, async (req, res) => {
  const { content, image_url, video_url } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO posts(user_id,content,image_url,video_url) VALUES($1,$2,$3,$4) RETURNING *',
      [req.user.id, content, image_url, video_url]
    );
    res.json(result.rows[0]);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    const post = await pool.query('SELECT * FROM posts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if(!post.rows[0]) return res.status(403).json({ error: 'غير مصرح' });
    await pool.query('DELETE FROM posts WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/posts/:id', auth, async (req, res) => {
  try {
    const post = await pool.query('SELECT * FROM posts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if(!post.rows[0]) return res.status(403).json({ error: 'غير مصرح' });
    const result = await pool.query(
      'UPDATE posts SET content=$1 WHERE id=$2 RETURNING *',
      [req.body.content, req.params.id]
    );
    res.json(result.rows[0]);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// ===== LIKE + إشعار =====
app.post('/api/posts/:id/like', auth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT 1 FROM likes WHERE user_id=$1 AND post_id=$2', [req.user.id, req.params.id]);
    if(existing.rowCount) {
      await pool.query('DELETE FROM likes WHERE user_id=$1 AND post_id=$2', [req.user.id, req.params.id]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO likes(user_id,post_id) VALUES($1,$2)', [req.user.id, req.params.id]);
      // إشعار صاحب المنشور
      const post = await pool.query('SELECT user_id FROM posts WHERE id=$1', [req.params.id]);
      if(post.rows[0]) await createNotification(pool, post.rows[0].user_id, req.user.id, 'like', req.params.id);
      res.json({ liked: true });
    }
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// ===== تعليقات + إشعار =====
app.get('/api/posts/:id/comments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT c.*, u.username, u.full_name FROM comments c JOIN users u ON c.user_id=u.id WHERE c.post_id=$1 ORDER BY c.created_at',
      [req.params.id]
    );
    res.json(result.rows);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/posts/:id/comments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'INSERT INTO comments(user_id,post_id,content) VALUES($1,$2,$3) RETURNING *',
      [req.user.id, req.params.id, req.body.content]
    );
    // إشعار صاحب المنشور
    const post = await pool.query('SELECT user_id FROM posts WHERE id=$1', [req.params.id]);
    if(post.rows[0]) await createNotification(pool, post.rows[0].user_id, req.user.id, 'comment', req.params.id);
    res.json(result.rows[0]);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// ===== USERS =====
app.get('/api/users', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, profile_picture, bio FROM users WHERE id!=$1',
      [req.user.id]
    );
    res.json(result.rows);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.get('/api/users/search', auth, async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const result = await pool.query(
      'SELECT id, username, full_name, profile_picture FROM users WHERE (username ILIKE $1 OR full_name ILIKE $1) AND id!=$2 LIMIT 20',
      [q, req.user.id]
    );
    res.json(result.rows);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.get('/api/users/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.bio, u.profile_picture,
      (SELECT COUNT(*) FROM follows WHERE follower_id=u.id) as following_count,
      (SELECT COUNT(*) FROM follows WHERE following_id=u.id) as followers_count,
      (SELECT COUNT(*) FROM posts WHERE user_id=u.id) as posts_count,
      EXISTS(SELECT 1 FROM follows WHERE follower_id=$2 AND following_id=u.id) as is_following
      FROM users u WHERE u.id=$1`,
      [req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// ===== FOLLOW + إشعار =====
app.post('/api/users/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if(parseInt(targetId) === req.user.id) return res.status(400).json({ error: 'لا يمكن متابعة نفسك' });
    const existing = await pool.query('SELECT * FROM follows WHERE follower_id=$1 AND following_id=$2', [req.user.id, targetId]);
    if(existing.rows[0]) {
      await pool.query('DELETE FROM follows WHERE follower_id=$1 AND following_id=$2', [req.user.id, targetId]);
      res.json({ following: false });
    } else {
      await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1,$2)', [req.user.id, targetId]);
      // إشعار المتابَع
      await createNotification(pool, targetId, req.user.id, 'follow');
      res.json({ following: true });
    }
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.get('/api/users/:id/followers', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.username, u.full_name, u.profile_picture FROM users u JOIN follows f ON f.follower_id=u.id WHERE f.following_id=$1',
      [req.params.id]
    );
    res.json(result.rows);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.get('/api/users/:id/following', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.username, u.full_name, u.profile_picture FROM users u JOIN follows f ON f.following_id=u.id WHERE f.follower_id=$1',
      [req.params.id]
    );
    res.json(result.rows);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// ===== NOTIFICATIONS =====
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.username, u.full_name, u.profile_picture
      FROM notifications n
      JOIN users u ON u.id = n.from_user_id
      WHERE n.user_id=$1
      ORDER BY n.created_at DESC LIMIT 30`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// تحديد الإشعارات كمقروءة
app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id]);
    res.json({ success: true });
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// عدد الإشعارات غير المقروءة
app.get('/api/notifications/unread', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id=$1 AND is_read=false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// ===== MESSAGES =====
app.get('/api/messages/:userId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM messages WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1) ORDER BY created_at`,
      [req.user.id, req.params.userId]
    );
    res.json(result.rows);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/messages', auth, async (req, res) => {
  const { receiver_id, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO messages(sender_id,receiver_id,content) VALUES($1,$2,$3) RETURNING *',
      [req.user.id, receiver_id, content]
    );
    res.json(result.rows[0]);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// ===== EXPLORE =====
app.get('/api/explore', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username, u.full_name,
      (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count
      FROM posts p JOIN users u ON p.user_id=u.id
      WHERE p.image_url IS NOT NULL
      ORDER BY likes_count DESC, p.created_at DESC LIMIT 30
    `);
    res.json(result.rows);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

// ===== UPLOAD =====
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.post('/api/posts/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname}`;
    const { error } = await supabase.storage.from('images').upload(fileName, file.buffer, { contentType: file.mimetype });
    if(error) throw error;
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    res.json({ url: data.publicUrl });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = app;
