const socketIO = require('socket.io');
const chatSocketHandler = require('./chatSocket');
const callSocketHandler = require('./callSocket');
const cookie = require('cookie');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

let io;

// Initialize socket server
exports.initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["cookie", "Cookie", "authorization", "Content-Type"]
    }
  });

    // Middleware for authentication
    io.use(async (socket, next) => {
      try {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
          return next(new Error("Authentication error: No cookies found"));
        }
  
        // Parse cookies
        const parsedCookies = cookie.parse(cookies);
        const token = parsedCookies.token; // Assuming your cookie is named "token"
  
        if (!token) {
          return next(new Error("Authentication error: No token in cookies"));
        }
  
        // Verify token
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
  
        if (!user) {
          return next(new Error("Authentication error: User not found"));
        }
  
        if (user.status === 'inactive') {
          return next(new Error("Authentication error: Account blocked"));
        }
  
        // Attach user data to socket
        socket.user = { id: user._id, name: `${user.firstName} ${user.lastName}`, role: user.role };
        console.log(`Socket authenticated for user: ${socket.user.name} (${socket.user.id})`);
  
        next();
      } catch (err) {
        return next(new Error("Authentication error: Invalid or expired token"));
      }
    });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user?.name || 'Unknown'})`);
    
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