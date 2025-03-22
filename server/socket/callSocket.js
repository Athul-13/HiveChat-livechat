const Call = require('../models/Call');
const User = require('../models/User');

// Import user socket mappings from main socket handler
const { userSocketMap } = require('./chatSocket');

// Handle all call-related socket events
exports.handleCallSocket = function(io, socket) {
  // User initiates a call to another user
  socket.on('callUser', async (data) => {
    try {
      const { recipientId, chatId, callType, token, channel, callId } = data;
      console.log('data',data);
      console.log(`Call initiated to user ${recipientId} with call ID ${callId}`);
      
      // Get sender info (the caller)
      const callerId = socket.userId || Object.keys(userSocketMap).find(id => userSocketMap.get(id) === socket._id);
      
      if (!callerId) {
        console.error('Cannot identify caller');
        return;
      }
      
      // Get caller details for the notification
      const caller = await User.findById(callerId, 'firstName lastName profilePicture');
      
      if (!caller) {
        console.error(`Caller with ID ${callerId} not found`);
        return;
      }
      
      // Get recipient's socket ID
      const recipientSocketId = userSocketMap.get(recipientId);
      
      // Create call record in database
      const existingCall = await Call.findOne({ _id: callId });

      if (existingCall) {
        existingCall.status = 'ringing';
        existingCall.recipient = recipientId;
        existingCall.agoraData = { token, channelName: channel };
      await existingCall.save();
      } else {
        console.error('Call not found in database, cannot update');
      }
      // If recipient is online, send them the call notification
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('incomingCall', {
          callerId,
          callerName: `${caller.firstName} ${caller.lastName}`,
          callerProfilePicture: caller.profilePicture,
          chatId,
          callType,
          token,
          channel,
          callId: existingCall._id.toString()
        });
        console.log(`Call notification sent to socket ${recipientSocketId}`);
      } else {
        console.log(`Recipient ${recipientId} is offline, call will be missed`);
        
        // Update call status to missed since recipient is offline
        await Call.findByIdAndUpdate(existingCall._id, { status: 'missed' });
        
        // Notify caller that recipient is unavailable
        socket.emit('callRejected', {
          message: 'User is unavailable'
        });
      }
    } catch (error) {
      console.error('Error handling call initiation:', error);
      socket.emit('error', { message: 'Failed to initiate call' });
    }
  });
  
  // Call was accepted by recipient
  socket.on('callAccepted', async (data) => {
    try {
      const { callerId, chatId } = data;
      console.log(`Call accepted by user ${socket.userId || 'unknown'} to caller ${callerId}`);
      
      // Update call status in database
      const call = await Call.findOne({
        initiator: callerId,
        recipient: socket.userId,
        status: 'ringing'
      }).sort({ createdAt: -1 });
      
      if (call) {
        call.status = 'ongoing';
        call.startTime = new Date();
        await call.save();
      }
      
      // Notify the caller that call was accepted
      const callerSocketId = userSocketMap.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('callAccepted', { chatId });
      }
    } catch (error) {
      console.error('Error handling call acceptance:', error);
    }
  });
  
  // Call was rejected by recipient
  socket.on('callRejected', async (data) => {
    try {
      const { callerId, chatId } = data;
      console.log(`Call rejected by user ${socket.userId || 'unknown'}`);
      
      // Update call status in database
      const call = await Call.findOne({
        initiator: callerId,
        recipient: socket.userId,
        status: 'ringing'
      }).sort({ createdAt: -1 });
      
      if (call) {
        call.status = 'rejected';
        await call.save();
      }
      
      // Notify the caller that call was rejected
      const callerSocketId = userSocketMap.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('callRejected', { chatId });
      }
    } catch (error) {
      console.error('Error handling call rejection:', error);
    }
  });
  
  // Call ended by either party
  socket.on('endCall', async (data) => {
    try {
      const { recipientId, chatId, callId } = data;
      console.log(`Call ended by user ${socket.userId || 'unknown'}`);
      
      // Get the user who ended the call
      const callEnderId = socket.userId || Object.keys(userSocketMap).find(id => userSocketMap.get(id) === socket.id);
      
      if (!callEnderId) {
        console.error('Cannot identify user who ended call');
        return;
      }
      
      // Update call status in database if callId is provided
      if (callId) {
        const call = await Call.findById(callId);
        if (call) {
          call.status = 'ended';
          call.endTime = new Date();
          // Calculate duration if the call had started
          if (call.startTime) {
            const duration = Math.round((new Date() - call.startTime) / 1000); // duration in seconds
            call.duration = duration;
          }
          await call.save();
        }
      } else {
        // Try to find the call by participants
        const call = await Call.findOne({
          $or: [
            { initiator: callEnderId, recipient: recipientId },
            { initiator: recipientId, recipient: callEnderId }
          ],
          status: 'ongoing'
        }).sort({ createdAt: -1 });
        
        if (call) {
          call.status = 'ended';
          call.endTime = new Date();
          if (call.startTime) {
            const duration = Math.round((new Date() - call.startTime) / 1000);
            call.duration = duration;
          }
          await call.save();
        }
      }
      
      // Notify the other party that call was ended
      const otherPartyId = recipientId;
      const otherPartySocketId = userSocketMap.get(otherPartyId);
      
      if (otherPartySocketId) {
        io.to(otherPartySocketId).emit('callEnded', { chatId });
      }
    } catch (error) {
      console.error('Error handling call end:', error);
    }
  });
  
  // Add user ID to socket for easier identification
  socket.on('userConnected', (userId) => {
    console.log(`User ${userId} connected with socket call ${socket.id}`);
    socket.userId = userId;
  });
};