const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary').v2;
const http = require('http');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { CallRoutes } = require('./routes/callRoutes');
const { initSocket } = require('./socket/socket');
require('dotenv').config();

const app = express()
const server = http.createServer(app);

const io = initSocket(server)

connectDB();

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    })
  );

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/call', CallRoutes(io));

app.use((req, res) => {
    res.status(404);
    res.json({ message: 'Resource not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});