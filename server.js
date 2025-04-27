const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'https://realtimechat-frontend.vercel.app',
    methods: ['GET', 'POST'],
    credentials: true
  }
});


// Directly Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://arakutrip2023december:yGs2F5c3UwAKMY3y@cluster0.xzu3cnk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Atlas connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Create a Message schema
const MessageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  time: { type: String, required: true },
});

// Create a Message model
const Message = mongoose.model('Message', MessageSchema);

// Store connected users {socket.id: username}
let users = {};

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on('join', async (username) => {
    users[socket.id] = username;
    console.log(`👤 ${username} joined`);

    const previousMessages = await Message.find({}).sort({ _id: 1 }).limit(50);
    socket.emit('chatHistory', previousMessages);

    io.emit('onlineUsers', Object.values(users));
  });

  socket.on('chatMessage', async (message) => {
    const username = users[socket.id];
    if (username) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const newMessage = new Message({ username, message, time });
      await newMessage.save();
      io.emit('broadcastMessage', { username, message, time });
    }
  });

  socket.on('typing', () => {
    const username = users[socket.id];
    if (username) {
      socket.broadcast.emit('userTyping', username);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    const disconnectedUser = users[socket.id];
    delete users[socket.id];
    io.emit('onlineUsers', Object.values(users));
    io.emit('userDisconnected', disconnectedUser);
  });
});

// API test route
app.get('/', (req, res) => {
  res.send('🚀 Backend server is running...');
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
