const socketIO = require('socket.io');
const chatSocketHandler = require('./chatSocket');

let io;

// Initialize socket server
exports.initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Use the handler function from chatSocket.js
    chatSocketHandler.handleSocket(io, socket);
  });

  return io;
};

// Get IO instance (for use in other parts of the application)
exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};