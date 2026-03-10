const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// جلب الرسائل بين مستخدمين
router.get('/:userId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.username as sender_name, u.full_name, u.profile_picture 
       FROM messages m JOIN users u ON m.sender_id=u.id
       WHERE (m.sender_id=$1 AND m.receiver_id=$2) 
       OR (m.sender_id=$2 AND m.receiver_id=$1)
       ORDER BY m.created_at`,
      [req.user.id, req.params.userId]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// إرسال رسالة
router.post('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, req.body.receiver_id, req.body.content]
    );
    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// قائمة المحادثات
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (u.id) u.id, u.username, u.full_name, u.profile_picture,
       m.content as last_message, m.created_at
       FROM messages m
       JOIN users u ON (m.sender_id=u.id OR m.receiver_id=u.id)
       WHERE (m.sender_id=$1 OR m.receiver_id=$1) AND u.id!=$1
       ORDER BY u.id, m.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
