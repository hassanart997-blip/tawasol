require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.use(cors());
app.use(express.json());

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if(!token) return res.status(401).json({ message: 'غير مصرح' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch(e) { return res.status(401).json({ message: 'رمز غير صالح' }); }
};

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cron daily to delete expired stories
cron.schedule('0 0 * * *', async () => {
  try { await pool.query('DELETE FROM stories WHERE expires_at < NOW()'); } catch(e){ console.error(e); }
});

// Socket.IO
io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
  socket.on('sendMessage', (data) => io.to(data.receiverId).emit('receiveMessage', data));
});

// Auth
app.post('/api/auth/register', async (req,res) => {
  const { username, email, full_name, password } = req.body;
  const hashed = await bcrypt.hash(password,10);
  try{
    const result = await pool.query('INSERT INTO users(username,email,full_name,password) VALUES($1,$2,$3,$4) RETURNING id, username, email, full_name',[username,email,full_name,hashed]);
    const user = result.rows[0];
    const token = jwt.sign({ id:user.id }, process.env.JWT_SECRET,{ expiresIn:'7d' });
    res.json({ user, token });
  } catch(e){ res.status(400).json({ message:e.message }); }
});

app.post('/api/auth/login', async (req,res) => {
  const { email,password } = req.body;
  try{
    const result = await pool.query('SELECT * FROM users WHERE email=$1',[email]);
    const user = result.rows[0];
    if(!user) return res.status(400).json({ message:'المستخدم غير موجود' });
    const match = await bcrypt.compare(password,user.password);
    if(!match) return res.status(400).json({ message:'كلمة المرور خاطئة' });
    const token = jwt.sign({ id:user.id }, process.env.JWT_SECRET,{ expiresIn:'7d' });
    res.json({ user:{ id:user.id, username:user.username, email:user.email, full_name:user.full_name }, token });
  } catch(e){ res.status(400).json({ message:e.message }); }
});

// Posts
app.get('/api/posts', authMiddleware, async (req,res)=>{
  try{
    const result = await pool.query('SELECT p.*, u.username, u.full_name, (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count, EXISTS(SELECT 1 FROM likes WHERE post_id=p.id AND user_id=$1) as liked FROM posts p JOIN users u ON p.user_id=u.id ORDER BY p.created_at DESC LIMIT 50',[req.user.id]);
    res.json(result.rows);
  } catch(e){ res.status(400).json({ message:e.message }); }
});

app.post('/api/posts', authMiddleware, async (req,res)=>{
  const { content,image_url,video_url } = req.body;
  try{
    const result = await pool.query('INSERT INTO posts(user_id,content,image_url,video_url) VALUES($1,$2,$3,$4) RETURNING *',[req.user.id,content,image_url,video_url]);
    res.json(result.rows[0]);
  } catch(e){ res.status(400).json({ message:e.message }); }
});

app.post('/api/posts/:id/like', authMiddleware, async (req,res)=>{
  try{
    const existing = await pool.query('SELECT 1 FROM likes WHERE user_id=$1 AND post_id=$2',[req.user.id,req.params.id]);
    if(existing.rowCount){ await pool.query('DELETE FROM likes WHERE user_id=$1 AND post_id=$2',[req.user.id,req.params.id]); res.json({ liked:false }); }
    else { await pool.query('INSERT INTO likes(user_id,post_id) VALUES($1,$2)',[req.user.id,req.params.id]); res.json({ liked:true }); }
  } catch(e){ res.status(400).json({ message:e.message }); }
});

// Stories
app.get('/api/posts/stories', authMiddleware, async (req,res)=>{
  try{
    const result = await pool.query('SELECT s.*, u.username, u.full_name FROM stories s JOIN users u ON s.user_id=u.id WHERE s.expires_at>NOW() ORDER BY s.created_at DESC');
    res.json(result.rows);
  } catch(e){ res.status(400).json({ message:e.message }); }
});

app.post('/api/posts/stories', authMiddleware, async (req,res)=>{
  try{
    const result = await pool.query('INSERT INTO stories(user_id,image_url) VALUES($1,$2) RETURNING *',[req.user.id,req.body.image_url]);
    res.json(result.rows[0]);
  } catch(e){ res.status(400).json({ message:e.message }); }
});

// Explore
app.get('/api/posts/explore', authMiddleware, async (req,res)=>{
  try{
    const result = await pool.query('SELECT p.*, u.username, u.full_name FROM posts p JOIN users u ON p.user_id=u.id WHERE p.image_url IS NOT NULL ORDER BY p.created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch(e){ res.status(400).json({ message:e.message }); }
});

// Reels
app.get('/api/posts/reels', authMiddleware, async (req,res)=>{
  try{
    const result = await pool.query('SELECT p.*, u.username, u.full_name FROM posts p JOIN users u ON p.user_id=u.id WHERE p.video_url IS NOT NULL ORDER BY p.created_at DESC');
    res.json(result.rows);
  } catch(e){ res.status(400).json({ message:e.message }); }
});

// Users Search
app.get('/api/users', authMiddleware, async (req,res)=>{
  try{
    const q = `%${req.query.q||''}%`;
    const result = await pool.query('SELECT id, username, full_name FROM users WHERE username ILIKE $1 OR full_name ILIKE $1 LIMIT 20',[q]);
    res.json(result.rows);
  } catch(e){ res.status(400).json({ message:e.message }); }
});

// Global error
app.use((err,req,res,next)=>{ console.error(err.stack); res.status(500).json({ message:'حدث خطأ', error:err.message }); });

const PORT = process.env.PORT||5000;
server.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
