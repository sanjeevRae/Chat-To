const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {}; // To keep track of rooms and their participants

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);

    // Notify other users in the room that a new user has joined
    socket.to(roomId).emit('new-peer', socket.id);

    // Store user in the room
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    rooms[roomId].push(socket.id);

    // Handle user leaving the room
    socket.on('disconnect', () => {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      socket.to(roomId).emit('user-disconnected', socket.id);
    });
  });

  socket.on('send-offer', (data) => {
    io.to(data.target).emit('receive-offer', data.offer);
  });

  socket.on('send-answer', (data) => {
    io.to(data.target).emit('receive-answer', data.answer);
  });

  socket.on('send-ice-candidate', (data) => {
    io.to(data.target).emit('receive-ice-candidate', data.candidate);
  });
});

server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
