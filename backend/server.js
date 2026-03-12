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

// ===== إعداد الاتصال بقاعدة البيانات =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ===== إعداد Supabase للتخزين =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // حد أقصى 10 ميجابايت
});

// ===== Middleware =====
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// ===== Middleware التحقق من التوكن =====
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'غير مصرح - لا يوجد توكن' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'توكن غير صالح' });
  }
};

// ===== دوال مساعدة =====
async function createNotification(userId, fromUserId, type, postId = null) {
  if (userId === fromUserId) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, from_user_id, type, post_id) 
       VALUES ($1, $2, $3, $4)`,
      [userId, fromUserId, type, postId]
    );
  } catch (error) {
    console.error('خطأ في إنشاء الإشعار:', error.message);
  }
}

// ========== AUTH ==========
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, full_name, password } = req.body;
    
    // التحقق من المدخلات
    if (!username || !email || !full_name || !password) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // إدخال المستخدم
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
    console.error('خطأ في التسجيل:', error);
    if (error.code === '23505') {
      res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود مسبقاً' });
    } else {
      res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
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
    console.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ========== PROFILE ==========
app.get('/api/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id, u.username, u.email, u.full_name, u.bio, u.profile_picture, u.created_at,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count
       FROM users u 
       WHERE u.id = $1`,
      [req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في جلب الملف الشخصي:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.put('/api/profile', auth, async (req, res) => {
  try {
    const { full_name, bio, profile_picture } = req.body;
    
    const result = await pool.query(
      `UPDATE users 
       SET full_name = $1, bio = $2, profile_picture = COALESCE($3, profile_picture)
       WHERE id = $4 
       RETURNING id, username, email, full_name, bio, profile_picture`,
      [full_name, bio, profile_picture, req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في تحديث الملف الشخصي:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ========== USERS ==========
app.get('/api/users/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id, u.username, u.full_name, u.bio, u.profile_picture, u.created_at,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) as is_following
       FROM users u 
       WHERE u.id = $1`,
      [req.params.id, req.user.id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في جلب بيانات المستخدم:', error);
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
    console.error('خطأ في البحث:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ========== FOLLOW ==========
app.post('/api/users/:id/follow', auth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    
    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'لا يمكن متابعة نفسك' });
    }
    
    // التحقق من وجود المستخدم
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [targetId]);
    if (!userCheck.rows[0]) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    // التحقق من وجود المتابعة
    const existing = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, targetId]
    );
    
    if (existing.rows[0]) {
      // إلغاء المتابعة
      await pool.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [req.user.id, targetId]
      );
      res.json({ following: false });
    } else {
      // متابعة
      await pool.query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
        [req.user.id, targetId]
      );
      
      // إنشاء إشعار
      await createNotification(targetId, req.user.id, 'follow');
      
      res.json({ following: true });
    }
  } catch (error) {
    console.error('خطأ في المتابعة:', error);
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
    console.error('خطأ في جلب المتابعين:', error);
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
    console.error('خطأ في جلب من يتابع:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ========== POSTS ==========
app.get('/api/posts', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.*, u.username, u.full_name, u.profile_picture,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as liked
       FROM posts p 
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب المنشورات:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
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
    console.error('خطأ في إنشاء المنشور:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
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
    console.error('خطأ في حذف المنشور:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
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
    console.error('خطأ في تعديل المنشور:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ========== LIKES ==========
app.post('/api/posts/:id/like', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    
    // التحقق من وجود المنشور
    const postCheck = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (!postCheck.rows[0]) {
      return res.status(404).json({ message: 'المنشور غير موجود' });
    }
    
    const existing = await pool.query(
      'SELECT * FROM likes WHERE user_id = $1 AND post_id = $2',
      [req.user.id, postId]
    );
    
    if (existing.rows[0]) {
      // إلغاء الإعجاب
      await pool.query(
        'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
        [req.user.id, postId]
      );
      res.json({ liked: false });
    } else {
      // إعجاب
      await pool.query(
        'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
        [req.user.id, postId]
      );
      
      // إنشاء إشعار لصاحب المنشور
      await createNotification(postCheck.rows[0].user_id, req.user.id, 'like', postId);
      
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('خطأ في الإعجاب:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ========== COMMENTS ==========
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
    console.error('خطأ في جلب التعليقات:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.post('/api/posts/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'التعليق لا يمكن أن يكون فارغاً' });
    }
    
    // التحقق من وجود المنشور
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
    
    // إنشاء إشعار لصاحب المنشور
    await createNotification(postCheck.rows[0].user_id, req.user.id, 'comment', req.params.id);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('خطأ في إضافة التعليق:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ========== STORIES ==========
app.get('/api/stories/:userId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
        CASE 
          WHEN s.media_url LIKE '%.mp4' OR s.media_url LIKE '%.mov' OR s.media_url LIKE '%.webm' THEN 'video'
          ELSE 'image'
        END as type
       FROM stories s
       WHERE s.user_id = $1 AND s.created_at > NOW() - INTERVAL '24 hours'
       ORDER BY s.created_at DESC`,
      [req.params.userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب القصص:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
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
    
    const { data } = supabase.storage
      .from('stories')
      .getPublicUrl(fileName);
    
    // حفظ القصة في قاعدة البيانات
    const storyResult = await pool.query(
      `INSERT INTO stories (user_id, media_url) 
       VALUES ($1, $2) 
       RETURNING *`,
      [req.user.id, data.publicUrl]
    );
    
    res.json(storyResult.rows[0]);
  } catch (error) {
    console.error('خطأ في رفع القصة:', error);
    res.status(500).json({ message: 'حدث خطأ في رفع الملف' });
  }
});

// ========== NOTIFICATIONS ==========
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
    console.error('خطأ في جلب الإشعارات:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
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
    console.error('خطأ في تحديث الإشعارات:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
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
    console.error('خطأ في جلب عدد الإشعارات:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ========== UPLOAD ==========
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
    
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    res.json({ url: data.publicUrl });
  } catch (error) {
    console.error('خطأ في رفع الملف:', error);
    res.status(500).json({ message: 'حدث خطأ في رفع الملف' });
  }
});

// ========== EXPLORE ==========
app.get('/api/explore', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.username, u.full_name, u.profile_picture,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.image_url IS NOT NULL
       ORDER BY likes_count DESC, p.created_at DESC
       LIMIT 30`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب المنشورات المقترحة:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'الخادم يعمل بشكل طبيعي',
    timestamp: new Date().toISOString()
  });
});

// ===== تشغيل السيرفر =====
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 الخادم يعمل على: http://localhost:${PORT}`);
  console.log(`📡 API متاح على: http://localhost:${PORT}/api`);
  console.log(`🕒 الوقت: ${new Date().toLocaleString('ar-SA')}`);
  console.log('='.repeat(50));
});

module.exports = app;
