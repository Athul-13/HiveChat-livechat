const Call = require('../models/Call');
const Chat = require('../models/Chat');
const User = require('../models/User');
const generateAgoraToken = require('../utils/agoraToken');
const { RtcRole } = require('agora-access-token');

exports.initiateCall = async (req, res) => {
    try {
      const { chatId, callType } = req.body;
      const userId = req.user._id; 
  
      // Validate input
      if (!chatId || !['voice', 'video'].includes(callType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request parameters'
        });
      }
  
      // Find chat and check if user is a participant
      const chat = await Chat.findById(chatId).populate('participants');
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }
  
      // Check if user is part of the chat
      const isParticipant = chat.participants.some(p => p._id.toString() === userId.toString());
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to initiate a call in this chat'
        });
      }
  
      // Check if there's already an active call in this chat
      const activeCall = await Call.findOne({
        chat: chatId,
        status: { $in: ['initiated', 'ongoing'] }
      });
  
      if (activeCall) {
        return res.status(409).json({
          success: false,
          message: 'There is already an active call in this chat',
          callId: activeCall._id
        });
      }
  
      // Create a unique channel name (combine chatId and timestamp)
      const channel = `${chatId}_${Date.now()}`;
  
      // Create new call record
      const newCall = new Call({
        chat: chatId,
        initiator: userId,
        participants: [userId], // Initially just the initiator
        callType,
        status: 'initiated',
        channel
      });
  
      await newCall.save();
  
      // Generate Agora token
      const token = generateAgoraToken(channel);
  
      return res.status(201).json({
        success: true,
        message: 'Call initiated successfully',
        call: newCall,
        agoraData: {
          callId: newCall._id.toString(),
          channel,
          token,
          uid: 0, // Client can generate unique UIDs if needed
          appId: process.env.AGORA_APP_ID
        }
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to initiate call',
        error: error.message
      });
    }
  };
  
  exports.joinCall = async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user._id;
        console.log('call',req.params);
        console.log('user',userId);

        // Find the call with participants populated
        const call = await Call.findById(callId).populate('participants');

        if (!call) {
            return res.status(404).json({
                success: false,
                message: 'Call not found'
            });
        }

        // Ensure participants array exists
        if (!Array.isArray(call.participants)) {
            call.participants = [];
        }

        // Check if call is still active
        if (call.status === 'ended' || call.status === 'missed') {
            return res.status(400).json({
                success: false,
                message: 'This call has already ended'
            });
        }

        // Update call status if it's the first participant joining after initiator
        if (call.status === 'initiated' && call.initiator.toString() !== userId.toString()) {
            call.status = 'ongoing';
            call.startTime = new Date();
        }

        // Check if user is already a participant
        const isAlreadyParticipant = call.participants.some(p => p._id.toString() === userId.toString());

        if (!isAlreadyParticipant) {
            call.participants.push(userId); // Push the ObjectId directly
        }

        await call.save();

        // Generate Agora token for this user
        const token = generateAgoraToken(call.channel);

        return res.status(200).json({
            success: true,
            message: 'Successfully joined call',
            call,
            agoraData: {
                channel: call.channel,
                token,
                uid: 0,
                appId: process.env.AGORA_APP_ID
            }
        });
    } catch (error) {
        console.error('Error joining call:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to join call',
            error: error.message
        });
    }
};


  exports.endCall = async (req, res) => {
    try {
      const { callId } = req.params;
      const userId = req.user._id;
  
      // Find the call
      const call = await Call.findById(callId);
      if (!call) {
        return res.status(404).json({
          success: false,
          message: 'Call not found'
        });
      }
  
      // Check if call is already ended
      if (call.status === 'ended' || call.status === 'missed') {
        return res.status(400).json({
          success: false,
          message: 'This call has already ended'
        });
      }
  
      // If call was never answered, mark it as missed
      if (call.status === 'initiated' && call.participants.length <= 1) {
        call.status = 'missed';
      } else {
        // Otherwise mark as ended
        call.status = 'ended';
        if (!call.startTime) {
          call.startTime = call.createdAt;
        }
        call.endTime = new Date();
      }
  
      await call.save();
  
      return res.status(200).json({
        success: true,
        message: 'Call ended successfully',
        call
      });
    } catch (error) {
      console.error('Error ending call:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to end call',
        error: error.message
      });
    }
  };
  
  exports.getChatCalls = async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;
  
      // Check if user is part of the chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }
  
      const isParticipant = chat.participants.some(p => p.toString() === userId.toString());
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view calls in this chat'
        });
      }
  
      // Get calls for this chat
      const calls = await Call.find({ chat: chatId })
        .populate('initiator', 'name avatar')
        .populate('participants', 'name avatar')
        .sort({ createdAt: -1 });
  
      return res.status(200).json({
        success: true,
        count: calls.length,
        calls
      });
    } catch (error) {
      console.error('Error getting chat calls:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get call history',
        error: error.message
      });
    }
  };
  
  exports.getUserCallHistory = async (req, res) => {
    try {
      const userId = req.user._id;
  
      // Get calls where user is a participant
      const calls = await Call.find({ participants: userId })
        .populate('initiator', 'name avatar')
        .populate('chat', 'name isGroupChat participants')
        .sort({ createdAt: -1 })
        .limit(50); // Limit to recent 50 calls
  
      return res.status(200).json({
        success: true,
        count: calls.length,
        calls
      });
    } catch (error) {
      console.error('Error getting user call history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get call history',
        error: error.message
      });
    }
  };