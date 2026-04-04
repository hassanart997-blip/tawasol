require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://zingy-muffin-8746a3.netlify.app',
  'https://tawasol-frontend-ten.vercel.app',
  'https://tawasol-new-ahts.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'غير مصرح - لا يوجد توكن' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'توكن غير صالح' });
  }
};

const createNotification = async (userId, fromUserId, type, postId = null) => {
  if (userId === fromUserId) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, from_user_id, type, post_id) VALUES ($1, $2, $3, $4)`,
      [userId, fromUserId, type, postId]
    );
  } catch (error) {
    console.error('Error creating notification:', error.message);
  }
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, full_name, password } = req.body;
    if (!username || !email || !full_name || !password) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, full_name, password) VALUES ($1, $2, $3, $4) RETURNING id, username, email, full_name, created_at`,
      [username, email, full_name, hashedPassword]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'اسم المستخدم أو البريد موجود مسبقاً' });
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, profile_picture: user.profile_picture, bio: user.bio }, token });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, bio, profile_picture FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'المستخدم غير موجود' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.get('/api/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, full_name, bio, profile_picture, created_at,
         (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) AS following_count,
         (SELECT COUNT(*) FROM follows WHERE following_id = users.id) AS followers_count,
         (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS posts_count
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'المستخدم غير موجود' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.put('/api/profile', auth, upload.single('profile_picture'), async (req, res) => {
  try {
    const { full_name, bio } = req.body;
    let profile_picture = null;
    if (req.file) {
      const file = req.file;
      const fileName = `profile-${req.user.id}-${Date.now()}-${file.originalname}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file.buffer, { contentType: file.mimetype });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      profile_picture = data.publicUrl;
    }
    const result = await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), bio = COALESCE($2, bio), profile_picture = COALESCE($3, profile_picture) WHERE id = $4 RETURNING id, username, email, full_name, bio, profile_picture`,
      [full_name, bio, profile_picture, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في تحديث الملف الشخصي' });
  }
});

app.get('/api/users/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, full_name, bio, profile_picture, created_at,
         (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) AS following_count,
         (SELECT COUNT(*) FROM follows WHERE following_id = users.id) AS followers_count,
         (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS posts_count,
         EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = users.id) AS is_following
       FROM users WHERE id = $1`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'المستخدم غير موجود' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.post('/api/users/:id/follow', auth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.user.id) return res.status(400).json({ message: 'لا يمكن متابعة نفسك' });
    const existing = await pool.query('SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, targetId]);
    if (existing.rows[0]) {
      await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, targetId]);
      return res.json({ following: false });
    } else {
      await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [req.user.id, targetId]);
      await createNotification(targetId, req.user.id, 'follow');
      return res.json({ following: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.get('/api/posts', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.username, u.full_name, u.profile_picture,
         (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
         (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
         EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) AS liked
       FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في جلب المنشورات' });
  }
});

app.post('/api/posts', auth, async (req, res) => {
  try {
    const { content, image_url, video_url } = req.body;
    const result = await pool.query(
      `INSERT INTO posts (user_id, content, image_url, video_url) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, content, image_url, video_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في إنشاء المنشور' });
  }
});

app.post('/api/posts/:id/like', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const postCheck = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (!postCheck.rows[0]) return res.status(404).json({ message: 'المنشور غير موجود' });
    const existing = await pool.query('SELECT * FROM likes WHERE user_id = $1 AND post_id = $2', [req.user.id, postId]);
    if (existing.rows[0]) {
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [req.user.id, postId]);
      return res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [req.user.id, postId]);
      await createNotification(postCheck.rows[0].user_id, req.user.id, 'like', postId);
      return res.json({ liked: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الإعجاب' });
  }
});

app.get('/api/posts/:id/comments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.username, u.full_name, u.profile_picture FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في جلب التعليقات' });
  }
});

app.post('/api/posts/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim() === '') return res.status(400).json({ message: 'التعليق لا يمكن أن يكون فارغاً' });
    const postCheck = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
    if (!postCheck.rows[0]) return res.status(404).json({ message: 'المنشور غير موجود' });
    const result = await pool.query(
      `INSERT INTO comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, req.params.id, content]
    );
    await createNotification(postCheck.rows[0].user_id, req.user.id, 'comment', req.params.id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في إضافة التعليق' });
  }
});

app.get('/api/notifications', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.username, u.full_name, u.profile_picture FROM notifications n JOIN users u ON n.from_user_id = u.id WHERE n.user_id = $1 ORDER BY n.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في جلب الإشعارات' });
  }
});

app.get('/api/explore', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.username, u.full_name, u.profile_picture, (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count FROM posts p JOIN users u ON p.user_id = u.id WHERE p.image_url IS NOT NULL ORDER BY likes_count DESC, p.created_at DESC LIMIT 30`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في جلب المنشورات' });
  }
});

app.get('/api/search', auth, async (req, res) => {
  try {
    const searchTerm = `%${req.query.q || ''}%`;
    const result = await pool.query(
      `SELECT id, username, full_name, profile_picture FROM users WHERE (username ILIKE $1 OR full_name ILIKE $1) AND id != $2 LIMIT 20`,
      [searchTerm, req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في البحث' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'الخادم يعمل بشكل طبيعي', timestamp: new Date().toISOString() });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'المسار غير موجود' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: 'حدث خطأ غير متوقع في الخادم' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
