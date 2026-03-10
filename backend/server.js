const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// حذف الستوريات المنتهية كل 24 ساعة
setInterval(async () => {
  try {
    await pool.query('DELETE FROM stories WHERE expires_at < NOW()');
    console.log('تم حذف الستوريات المنتهية');
  } catch(e) {
    console.error(e);
  }
}, 86400000);

io.on('connection', (socket) => {
  console.log('user connected');

  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('sendMessage', (data) => {
    io.to(data.receiverId).emit('receiveMessage', data);
    io.emit('receiveMessage', data);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

module.exports = app;
