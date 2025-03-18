const { EVENTS } = require('./socketConfig');
const Call = require('../models/Call');
const { userSocketMap } = require('./chatSocket'); 

exports.handleCallSocket = function(io, socket) {
  socket.on(EVENTS.JOIN_ROOM, (chatId) => {
    socket.join(chatId);
    console.log(`User with socket ${socket.id} joined call room ${chatId}`);
  });

  socket.on(EVENTS.LEAVE_ROOM, (chatId) => {
    socket.leave(chatId);
    console.log(`User with socket ${socket.id} left call room ${chatId}`);
  });

  socket.on(EVENTS.OFFER, (data) => {
    const recipientSocketId = userSocketMap.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(EVENTS.OFFER, data);
    }
  });

  socket.on(EVENTS.ANSWER, (data) => {
    const recipientSocketId = userSocketMap.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(EVENTS.ANSWER, data);
    }
  });

  socket.on(EVENTS.ICE_CANDIDATE, (data) => {
    const recipientSocketId = userSocketMap.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(EVENTS.ICE_CANDIDATE, data);
    }
  });

  socket.on(EVENTS.ACCEPT_CALL, async ({ callId, userId }) => {
    const call = await Call.findById(callId);
    if (call) {
      call.status = 'ongoing';
      call.startTime = new Date();
      await call.save();
      io.to(call.chat.toString()).emit(EVENTS.ACCEPT_CALL, { callId, userId });
    }
  });

  socket.on(EVENTS.END_CALL, async ({ callId }) => {
    const call = await Call.findById(callId);
    if (call) {
      call.status = 'ended';
      call.endTime = new Date();
      await call.save();
      io.to(call.chat.toString()).emit(EVENTS.END_CALL, { callId });
    }
  });
};