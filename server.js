const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 5000;

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Handles any requests that don't match the ones above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

let rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join-room', (roomId) => {
    console.log(`User ${socket.id} joining room ${roomId}`);

    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = new Set();
    }

    rooms[roomId].add(socket.id);
    console.log(`Participants in room ${roomId}: ${rooms[roomId].size}`);

    // Broadcast updated participant count
    io.to(roomId).emit('update-participant-count', rooms[roomId].size);

    socket.on('send-offer', (data) => {
      socket.to(data.target).emit('receive-offer', {
        offer: data.offer,
        peerId: socket.id,
      });
    });

    socket.on('send-answer', (data) => {
      socket.to(data.target).emit('receive-answer', {
        answer: data.answer,
        peerId: socket.id,
      });
    });

    socket.on('send-ice-candidate', (data) => {
      socket.to(data.target).emit('receive-ice-candidate', data);
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);

      rooms[roomId].delete(socket.id);

      // Broadcast updated participant count
      io.to(roomId).emit('update-participant-count', rooms[roomId].size);

      if (rooms[roomId].size === 0) {
        delete rooms[roomId];
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
      for (const roomId in rooms) {
        rooms[roomId].delete(socket.id);

        if (rooms[roomId].size === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit('update-participant-count', rooms[roomId].size);
        }
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
