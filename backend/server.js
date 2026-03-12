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

// ==================== DATABASE CONNECTION ====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ==================== SUPABASE SETUP ====================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// ==================== CORS FLEXIBLE CONFIGURATION ====================
// قائمة الأصول المسموح بها (تم تحديث رابط Netlify)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://zingy-muffin-8746a3.netlify.app', // الرابط الصحيح لـ Netlify
  // يمكنك إضافة أي نطاقات أخرى هنا
];

app.use(cors({
  origin: (origin, callback) => {
    // في بيئة التطوير، اسمح بكل الأصول (مريح للاختبار)
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // في الإنتاج، اسمح فقط للأصول في القائمة
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('🚫 Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// ==================== AUTH MIDDLEWARE ====================
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'غير مصرح - لا يوجد توكن' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'توكن غير صالح' });
  }
};

// ==================== HELPER FUNCTIONS ====================
const createNotification = async (userId, fromUserId, type, postId = null) => {
  if (userId === fromUserId) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, from_user_id, type, post_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, fromUserId, type, postId]
    );
  } catch (error) {
    console.error('❌ Error creating notification:', error.message);
  }
};

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, full_name, password } = req.body;
    if (!username || !email || !full_name || !password) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, full_name, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, full_name, created_at`,
      [username, email, full_name, hashedPassword]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('❌ Register error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'اسم المستخدم أو البريد موجود مسبقاً' });
    }
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        profile_picture: user.profile_picture,
        bio: user.bio
      },
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ==================== PROFILE ROUTES ====================
app.get('/api/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id, username, email, full_name, bio, profile_picture, created_at,
         (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) AS following_count,
         (SELECT COUNT(*) FROM follows WHERE following_id = users.id) AS followers_count,
         (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS posts_count
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
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
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600'
        });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      profile_picture = data.publicUrl;
    }
    const result = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           bio = COALESCE($2, bio),
           profile_picture = COALESCE($3, profile_picture)
       WHERE id = $4
       RETURNING id, username, email, full_name, bio, profile_picture`,
      [full_name, bio, profile_picture, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ message: 'حدث خطأ في تحديث الملف الشخصي' });
  }
});

// ==================== USERS ROUTES ====================
app.get('/api/users/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT
         id, username, full_name, bio, profile_picture, created_at,
         (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) AS following_count,
         (SELECT COUNT(*) FROM follows WHERE following_id = users.id) AS followers_count,
         (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS posts_count,
         EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = users.id) AS is_following
       FROM users
       WHERE id = $1`,
      [id, req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Fetch user error:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.get('/api/users/search', auth, async (req, res) => {
  try {
    const searchTerm = `%${req.query.q || ''}%`;
    const result = await pool.query(
      `SELECT id, username, full_name, profile_picture
       FROM users
       WHERE (username ILIKE $1 OR full_name ILIKE $1) AND id != $2
       LIMIT 20`,
      [searchTerm, req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ==================== FOLLOW ROUTES ====================
app.post('/api/users/:id/follow', auth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'لا يمكن متابعة نفسك' });
    }
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [targetId]);
    if (!userCheck.rows[0]) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    const existing = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, targetId]
    );
    if (existing.rows[0]) {
      await pool.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [req.user.id, targetId]
      );
      return res.json({ following: false });
    } else {
      await pool.query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
        [req.user.id, targetId]
      );
      await createNotification(targetId, req.user.id, 'follow');
      return res.json({ following: true });
    }
  } catch (error) {
    console.error('❌ Follow error:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.get('/api/users/:id/followers', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture
       FROM users u
       JOIN follows f ON f.follower_id = u.id
       WHERE f.following_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Followers fetch error:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.get('/api/users/:id/following', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture
       FROM users u
       JOIN follows f ON f.following_id = u.id
       WHERE f.follower_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Following fetch error:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ==================== POSTS ROUTES ====================
app.get('/api/posts', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.*,
         u.username, u.full_name, u.profile_picture,
         (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
         (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
         EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) AS liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Fetch posts error:', error);
    res.status(500).json({ message: 'حدث خطأ في جلب المنشورات' });
  }
});

app.post('/api/posts', auth, async (req, res) => {
  try {
    const { content, image_url, video_url } = req.body;
    const result = await pool.query(
      `INSERT INTO posts (user_id, content, image_url, video_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, content, image_url, video_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Create post error:', error);
    res.status(500).json({ message: 'حدث خطأ في إنشاء المنشور' });
  }
});

app.put('/api/posts/:id', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const postCheck = await pool.query(
      'SELECT * FROM posts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!postCheck.rows[0]) {
      return res.status(403).json({ message: 'غير مصرح بتعديل هذا المنشور' });
    }
    const result = await pool.query(
      'UPDATE posts SET content = $1 WHERE id = $2 RETURNING *',
      [content, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Edit post error:', error);
    res.status(500).json({ message: 'حدث خطأ في تعديل المنشور' });
  }
});

app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    const postCheck = await pool.query(
      'SELECT * FROM posts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!postCheck.rows[0]) {
      return res.status(403).json({ message: 'غير مصرح بحذف هذا المنشور' });
    }
    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف المنشور بنجاح' });
  } catch (error) {
    console.error('❌ Delete post error:', error);
    res.status(500).json({ message: 'حدث خطأ في حذف المنشور' });
  }
});

// ==================== LIKES ROUTES ====================
app.post('/api/posts/:id/like', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const postCheck = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (!postCheck.rows[0]) {
      return res.status(404).json({ message: 'المنشور غير موجود' });
    }
    const existing = await pool.query(
      'SELECT * FROM likes WHERE user_id = $1 AND post_id = $2',
      [req.user.id, postId]
    );
    if (existing.rows[0]) {
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [req.user.id, postId]);
      return res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [req.user.id, postId]);
      await createNotification(postCheck.rows[0].user_id, req.user.id, 'like', postId);
      return res.json({ liked: true });
    }
  } catch (error) {
    console.error('❌ Like error:', error);
    res.status(500).json({ message: 'حدث خطأ في الإعجاب' });
  }
});

// ==================== COMMENTS ROUTES ====================
app.get('/api/posts/:id/comments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.username, u.full_name, u.profile_picture
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Fetch comments error:', error);
    res.status(500).json({ message: 'حدث خطأ في جلب التعليقات' });
  }
});

app.post('/api/posts/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'التعليق لا يمكن أن يكون فارغاً' });
    }
    const postCheck = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
    if (!postCheck.rows[0]) {
      return res.status(404).json({ message: 'المنشور غير موجود' });
    }
    const result = await pool.query(
      `INSERT INTO comments (user_id, post_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, req.params.id, content]
    );
    await createNotification(postCheck.rows[0].user_id, req.user.id, 'comment', req.params.id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Add comment error:', error);
    res.status(500).json({ message: 'حدث خطأ في إضافة التعليق' });
  }
});

// ==================== STORIES ROUTES ====================
app.get('/api/stories/:userId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         s.*,
         CASE
           WHEN s.media_url LIKE '%.mp4' OR s.media_url LIKE '%.mov' OR s.media_url LIKE '%.webm' THEN 'video'
           ELSE 'image'
         END AS type
       FROM stories s
       WHERE s.user_id = $1 AND s.created_at > NOW() - INTERVAL '24 hours'
       ORDER BY s.created_at DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Fetch stories error:', error);
    res.status(500).json({ message: 'حدث خطأ في جلب القصص' });
  }
});

app.post('/api/stories/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'لم يتم رفع أي ملف' });
    }
    const fileName = `${Date.now()}-${file.originalname}`;
    const { error } = await supabase.storage
      .from('stories')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600'
      });
    if (error) throw error;
    const { data } = supabase.storage.from('stories').getPublicUrl(fileName);
    const storyResult = await pool.query(
      `INSERT INTO stories (user_id, media_url)
       VALUES ($1, $2)
       RETURNING *`,
      [req.user.id, data.publicUrl]
    );
    res.json(storyResult.rows[0]);
  } catch (error) {
    console.error('❌ Story upload error:', error);
    res.status(500).json({ message: 'حدث خطأ في رفع القصة' });
  }
});

// ==================== NOTIFICATIONS ROUTES ====================
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.username, u.full_name, u.profile_picture
       FROM notifications n
       JOIN users u ON n.from_user_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Fetch notifications error:', error);
    res.status(500).json({ message: 'حدث خطأ في جلب الإشعارات' });
  }
});

app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ message: 'تم تحديث الإشعارات' });
  } catch (error) {
    console.error('❌ Mark notifications read error:', error);
    res.status(500).json({ message: 'حدث خطأ في تحديث الإشعارات' });
  }
});

app.get('/api/notifications/unread', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('❌ Unread count error:', error);
    res.status(500).json({ message: 'حدث خطأ في جلب عدد الإشعارات' });
  }
});

// ==================== UPLOAD (General) ====================
app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'لم يتم رفع أي ملف' });
    }
    const fileName = `${Date.now()}-${file.originalname}`;
    const bucket = req.body.bucket || 'images';
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype
      });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    res.json({ url: data.publicUrl });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ message: 'حدث خطأ في رفع الملف' });
  }
});

// ==================== EXPLORE ====================
app.get('/api/explore', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.*,
         u.username, u.full_name, u.profile_picture,
         (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.image_url IS NOT NULL
       ORDER BY likes_count DESC, p.created_at DESC
       LIMIT 30`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Explore error:', error);
    res.status(500).json({ message: 'حدث خطأ في جلب المنشورات المقترحة' });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'الخادم يعمل بشكل طبيعي',
    timestamp: new Date().toISOString()
  });
});

// ==================== 404 HANDLER ====================
app.use('*', (req, res) => {
  res.status(404).json({ message: 'المسار غير موجود' });
});

// ==================== GLOBAL ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err.stack);
  res.status(500).json({ message: 'حدث خطأ غير متوقع في الخادم' });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 الخادم يعمل على: http://localhost:${PORT}`);
  console.log(`📡 API متاح على: http://localhost:${PORT}/api`);
  console.log(`🕒 الوقت: ${new Date().toLocaleString('ar-SA')}`);
  console.log('='.repeat(60));
});

module.exports = app;
