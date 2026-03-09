const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'توكن غير صالح' });
  }
};

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        bio TEXT,
        profile_picture VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        content TEXT,
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        post_id INTEGER REFERENCES posts(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        post_id INTEGER REFERENCES posts(id),
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(50),
        content TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch(e) {
    console.error('DB init error:', e.message);
  }
}

app.get('/', (req, res) => {
  res.json({ message: 'تواصل API يعمل!' });
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, full_name) VALUES ($1,$2,$3,$4) RETURNING id, username, email, full_name',
      [username, email, hashed, full_name]
    );
    const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET);
    res.json({ token, user: result.rows[0] });
  } catch (e) {
    res.status(400).json({ error: 'خطأ في التسجيل: ' + e.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!result.rows[0]) return res.status(400).json({ error: 'المستخدم غير موجود' });
    const valid = await bcrypt.compare(password, result.rows[0].password);
    if (!valid) return res.status(400).json({ error: 'كلمة المرور خاطئة' });
    const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET);
    res.json({ token, user: result.rows[0] });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/posts', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username, u.full_name, u.profile_picture,
      (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id=p.id) as comments_count
      FROM posts p JOIN users u ON p.user_id=u.id
      ORDER BY p.created_at DESC LIMIT 20
    `);
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/posts', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const result = await pool.query(
      'INSERT INTO posts (user_id, content) VALUES ($1,$2) RETURNING *',
      [req.user.id, content]
    );
    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/posts/:id/like', auth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM likes WHERE user_id=$1 AND post_id=$2', [req.user.id, req.params.id]);
    if (existing.rows[0]) {
      await pool.query('DELETE FROM likes WHERE user_id=$1 AND post_id=$2', [req.user.id, req.params.id]);
    } else {
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1,$2)', [req.user.id, req.params.id]);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/posts/:id/comments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id=u.id WHERE c.post_id=$1',
      [req.params.id]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/posts/:id/comments', auth, async (req, res) => {
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

app.get('/api/friends', auth, async (req, res) => {
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

app.post('/api/friends/request', auth, async (req, res) => {
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

app.get('/api/users', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, full_name, profile_picture FROM users WHERE id!=$1', [req.user.id]);
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/profile', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, full_name, bio, profile_picture FROM users WHERE id=$1', [req.user.id]);
    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/messages/:userId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.username as sender_name FROM messages m 
      JOIN users u ON m.sender_id=u.id
      WHERE (m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1)
      ORDER BY m.created_at`,
      [req.user.id, req.params.userId]
    );
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/messages', auth, async (req, res) => {
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

app.get('/api/notifications', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

initDB();
module.exports = app;
