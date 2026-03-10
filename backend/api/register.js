const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, email, password, full_name } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, full_name) VALUES ($1,$2,$3,$4) RETURNING id, username, email, full_name',
      [username, email, hashed, full_name]
    );
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET || 'secret');
    res.json({ token, user: result.rows[0] });
  } catch (e) {
    res.status(400).json({ error: 'خطأ في التسجيل: ' + e.message });
  }
};
