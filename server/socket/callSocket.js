const { EVENTS } = require('./socketConfig');
const Call = require('../models/Call');
const { userSocketMap } = require('./chatSocket'); 

exports.handleCallSocket = function(io, socket) {
  // Store user ID for easier reference
  const userId = socket.user ? socket.user.id : null;
  console.log(`Socket ${socket.id} initialized for user ${userId || 'unknown'}`);
  
  socket.on(EVENTS.JOIN_ROOM, (chatId) => {
    socket.join(chatId);
    console.log(`User with socket ${socket.id} (${userId || 'unknown'}) joined call room ${chatId}`);
  });

  socket.on(EVENTS.LEAVE_ROOM, (chatId) => {
    socket.leave(chatId);
    console.log(`User with socket ${socket.id} (${userId || 'unknown'}) left call room ${chatId}`);
  });

  socket.on(EVENTS.OFFER, async (data) => {
    console.log(`Received OFFER from ${data.from} to ${data.to} for call ${data.callId}`, {
      callType: data.callType,
      chatId: data.chatId
    });
    
    // Update call record if it exists
    try {
      const call = await Call.findById(data.callId);
      if (call) {
        console.log(`Found call record ${data.callId}, status: ${call.status}`);
      }
    } catch (err) {
      console.error(`Error finding call ${data.callId}:`, err);
    }
    
    const recipientSocketId = userSocketMap.get(data.to);
    console.log(`Recipient ${data.to} socket ID: ${recipientSocketId || 'not found'}`);
    
    if (recipientSocketId) {
      // Option 1: Send directly to socket
      io.to(recipientSocketId).emit(EVENTS.OFFER, data);
      console.log(`Sent OFFER directly to socket ${recipientSocketId}`);
      
      // Option 2: Also broadcast to the chat room
      if (data.chatId) {
        io.to(data.chatId).emit(EVENTS.OFFER, data);
        console.log(`Also broadcast OFFER to chat room ${data.chatId}`);
      }
    } else {
      console.warn(`Could not send OFFER - recipient ${data.to} not connected`);
    }
  });

  socket.on(EVENTS.ANSWER, (data) => {
    console.log(`Received ANSWER from ${data.from} to ${data.to} for call ${data.callId}`, {
      sdp: data.sdp ? data.sdp.type : 'No SDP'
    });
    
    const recipientSocketId = userSocketMap.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(EVENTS.ANSWER, data);
      console.log(`Sent ANSWER to socket ${recipientSocketId}`);
    } else {
      console.warn(`Could not send ANSWER - recipient ${data.to} not connected`);
    }
  });

  socket.on(EVENTS.ICE_CANDIDATE, (data) => {
    console.log(`Received ICE_CANDIDATE from ${data.from} to ${data.to} for call ${data.callId}`);
    
    const recipientSocketId = userSocketMap.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(EVENTS.ICE_CANDIDATE, data);
      console.log(`Sent ICE_CANDIDATE to socket ${recipientSocketId}`);
    } else {
      console.warn(`Could not send ICE_CANDIDATE - recipient ${data.to} not connected`);
    }
  });

  socket.on(EVENTS.ACCEPT_CALL, async (data) => {
    console.log(`Received ACCEPT_CALL for call ${data.callId} from user ${data.from}`);
    
    try {
      const call = await Call.findById(data.callId);
      if (call) {
        call.status = 'ongoing';
        call.startTime = new Date();
        await call.save();
        console.log(`Call ${data.callId} status updated to 'ongoing'`);
        
        // Send to specific recipient
        const recipientSocketId = userSocketMap.get(data.to);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit(EVENTS.ACCEPT_CALL, data);
          console.log(`Sent ACCEPT_CALL to socket ${recipientSocketId}`);
        }
        
        // Also broadcast to the room
        io.to(call.chat.toString()).emit(EVENTS.ACCEPT_CALL, data);
        console.log(`Also broadcast ACCEPT_CALL to chat room ${call.chat.toString()}`);
      } else {
        console.error(`Call ${data.callId} not found`);
      }
    } catch (err) {
      console.error(`Error updating call ${data.callId}:`, err);
    }
  });

  socket.on(EVENTS.END_CALL, async ({ callId }) => {
    console.log(`Received END_CALL for call ${callId}`);
    
    try {
      const call = await Call.findById(callId);
      if (call) {
        call.status = 'ended';
        call.endTime = new Date();
        await call.save();
        console.log(`Call ${callId} status updated to 'ended'`);
        
        io.to(call.chat.toString()).emit(EVENTS.END_CALL, { callId });
        console.log(`Broadcast END_CALL to chat room ${call.chat.toString()}`);
      } else {
        console.error(`Call ${callId} not found`);
      }
    } catch (err) {
      console.error(`Error updating call ${callId}:`, err);
    }
  });
};