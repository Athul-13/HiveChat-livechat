const socketIO = require('socket.io');
const chatSocketHandler = require('./chatSocket');
const callSocketHandler = require('./callSocket');

let io;

// Initialize socket server
exports.initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Use the handler function from chatSocket.js
    chatSocketHandler.handleSocket(io, socket);

    // Initialize call socket handlers
    callSocketHandler.handleCallSocket(io, socket);
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