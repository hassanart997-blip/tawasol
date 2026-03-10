const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const upload = multer({ storage: multer.memoryStorage() });

// رفع صورة
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname}`;
    const { error } = await supabase.storage
      .from('images')
      .upload(fileName, file.buffer, { contentType: file.mimetype });
    if (error) throw error;
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    res.json({ url: data.publicUrl });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// كل المنشورات
router.get('/', auth, async (req, res) => {
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
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// إنشاء منشور
router.post('/', auth, async (req, res) => {
  try {
    const { content, image_url } = req.body;
    const result = await pool.query(
      'INSERT INTO posts (user_id, content, image_url) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, content, image_url || null]
    );
    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// إعجاب
router.post('/:id/like', auth, async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM likes WHERE user_id=$1 AND post_id=$2',
      [req.user.id, req.params.id]
    );
    if (existing.rows[0]) {
      await pool.query('DELETE FROM likes WHERE user_id=$1 AND post_id=$2', [req.user.id, req.params.id]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1,$2)', [req.user.id, req.params.id]);
      res.json({ liked: true });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// تعليقات
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT c.*, u.username, u.full_name, u.profile_picture FROM comments c JOIN users u ON c.user_id=u.id WHERE c.post_id=$1 ORDER BY c.created_at',
      [req.params.id]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'INSERT INTO comments (user_id, post_id, content) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, req.params.id, req.body.content]
    );
    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// استكشاف
router.get('/explore', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username, u.full_name, u.profile_picture,
      (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count
      FROM posts p JOIN users u ON p.user_id=u.id
      WHERE p.image_url IS NOT NULL
      ORDER BY likes_count DESC LIMIT 30
    `);
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ريلز
router.get('/reels', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username, u.full_name, u.profile_picture,
      (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count
      FROM posts p JOIN users u ON p.user_id=u.id
      WHERE p.video_url IS NOT NULL
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
