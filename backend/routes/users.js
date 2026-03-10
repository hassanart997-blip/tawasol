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

// الملف الشخصي
router.get('/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, bio, profile_picture FROM users WHERE id=$1',
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

// مستخدم محدد
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, bio, profile_picture FROM users WHERE id=$1',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// الأصدقاء
router.get('/friends', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.* FROM users u JOIN friendships f ON 
      (f.friend_id=u.id AND f.user_id=$1) OR (f.user_id=u.id AND f.friend_id=$1)
      WHERE f.status='accepted'`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// طلب صداقة
router.post('/friends/request', auth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO friendships (user_id, friend_id) VALUES ($1,$2)',
      [req.user.id, req.body.friend_id]
    );
    res.json({ success: true });
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

module.exports = router;
