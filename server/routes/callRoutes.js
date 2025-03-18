const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const { userSocketMap } = require('../socket/chatSocket');

// Pass io instance to routes for emitting socket events
let io;

function CallRoutes(socketIo) {
  io = socketIo;

  router.post('/initiate', async (req, res) => {
    const { chatId, initiatorId, participantIds, callType } = req.body;

    if (!chatId || !initiatorId || !participantIds || !callType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const call = new Call({
        chat: chatId,
        initiator: initiatorId,
        participants: [...participantIds, initiatorId], // Include initiator
        callType,
        status: 'initiated',
      });
      await call.save();

      // Notify all participants via their socket IDs
      const allParticipants = [...participantIds, initiatorId];
      allParticipants.forEach((userId) => {
      const socketId = userSocketMap.get(userId);
      if (socketId) {
          io.to(socketId).emit('incomingCall', {
          callId: call._id,
          initiatorId,
          callType,
          chatId, // Include chatId for context
          });
      }
      });

      res.status(201).json({ callId: call._id, message: 'Call initiated' });
    } catch (error) {
      console.error('Error initiating call:', error);
      res.status(500).json({ error: 'Failed to initiate call' });
    }
  });

  return router;
}

module.exports = { CallRoutes };