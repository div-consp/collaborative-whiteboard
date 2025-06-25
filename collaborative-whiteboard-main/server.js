const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(express.static(path.join(__dirname, 'public')));

let elements = [];
let users = {};

io.on('connection', (socket) => {
  // Assign user a random color and name
  const colors = ['#4F46E5','#F59E42','#E14D4D','#2DD4BF','#10B981','#FBBF24','#fff','#9333ea','#2563eb','#dc2626'];
  const userColor = colors[Math.floor(Math.random()*colors.length)];
  const userName = `User${Math.floor(1000+Math.random()*9000)}`;
  users[socket.id] = { id: socket.id, color: userColor, name: userName };

  // Send current state and user list to new user
  socket.emit('init', { elements, users: Object.values(users), yourId: socket.id });

  // Broadcast new user to others
  socket.broadcast.emit('user-joined', users[socket.id]);
  io.emit('user-count', Object.keys(users).length);

  // Drawing sync
  socket.on('draw-element', (element) => {
    elements.push(element);
    socket.broadcast.emit('draw-element', element);
  });

  // Clear
  socket.on('clear', () => {
    elements = [];
    io.emit('clear');
  });

  // Undo (local only, not synced)
  socket.on('undo', (elementId) => {
    elements = elements.filter(el => el.id !== elementId);
    io.emit('remove-element', elementId);
  });

  // Redo (local only, not synced)
  socket.on('redo', (element) => {
    elements.push(element);
    io.emit('draw-element', element);
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('user-left', socket.id);
    io.emit('user-count', Object.keys(users).length);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Whiteboard server running on port ${PORT}`);
});
