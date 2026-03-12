const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// كل المستخدمين
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, profile_picture, bio FROM users WHERE id!=$1',
      [req.user.id]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// بحث
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const result = await pool.query(
      `SELECT id, username, full_name, profile_picture FROM users 
       WHERE (username ILIKE $1 OR full_name ILIKE $1) AND id!=$2`,
      [`%${q}%`, req.user.id]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// الملف الشخصي للمستخدم الحالي
router.get('/profile', auth, async (req, res) => {
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
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// تعديل الملف الشخصي
router.put('/profile', auth, async (req, res) => {
  try {
    const { full_name, bio, profile_picture } = req.body;
    const result = await pool.query(
      'UPDATE users SET full_name=$1, bio=$2, profile_picture=$3 WHERE id=$4 RETURNING id, username, email, full_name, bio, profile_picture',
      [full_name, bio, profile_picture, req.user.id]
    );
    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// إشعارات
router.get('/notifications', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// الأصدقاء (المتابَعون)
router.get('/friends', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture FROM users u
      JOIN follows f ON f.following_id=u.id WHERE f.follower_id=$1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// متابعة / إلغاء متابعة
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if(parseInt(targetId) === req.user.id) return res.status(400).json({ error: 'لا يمكن متابعة نفسك' });
    const existing = await pool.query(
      'SELECT * FROM follows WHERE follower_id=$1 AND following_id=$2',
      [req.user.id, targetId]
    );
    if(existing.rows[0]) {
      await pool.query('DELETE FROM follows WHERE follower_id=$1 AND following_id=$2', [req.user.id, targetId]);
      res.json({ following: false });
    } else {
      await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1,$2)', [req.user.id, targetId]);
      res.json({ following: true });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// قائمة المتابعين (من يتابع هذا الشخص)
router.get('/:id/followers', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture FROM users u
      JOIN follows f ON f.follower_id=u.id WHERE f.following_id=$1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// قائمة المتابَعين (من يتابعه هذا الشخص)
router.get('/:id/following', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture FROM users u
      JOIN follows f ON f.following_id=u.id WHERE f.follower_id=$1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// مستخدم محدد مع عدد المتابعين
router.get('/:id', auth, async (req, res) => {
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
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
