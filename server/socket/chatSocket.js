const { EVENTS } = require('./socketConfig');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

// Store user socket mappings
const userSocketMap = new Map();

// Store online users status
const onlineUsers = new Set();

// Export these variables directly
exports.userSocketMap = userSocketMap;
exports.onlineUsers = onlineUsers;

// Export the socket handler function
exports.handleSocket = function(io, socket) {
  // Handle user connection/identification
  socket.on('userConnected', async (userId) => {
    console.log(`User ${userId} connected with socket ${socket.id}`);
    userSocketMap.set(userId, socket.id);
    
    // Add to online users set
    onlineUsers.add(userId);
    
    // Update user status to online
    try {
        // Send the current list of online users to the newly connected user
        // socket.emit('onlineUsers', Array.from(onlineUsers));

        // Send the current list of online users to ALL clients (not just this socket)
        io.emit('onlineUsers', Array.from(onlineUsers));
        // Emit the userConnected event to all clients
        io.emit('userConnected', userId);
        
        // Import notification controller here to avoid circular dependency
        const notificationController = require('../controllers/notificationController');
        
        // Send unread notification count
        const unreadCount = await notificationController.getUnreadCount(userId);
        socket.emit('unreadNotificationsCount', { count: unreadCount });
      } catch (err) {
        console.error('Error updating user status:', err);
      }
  });
  
  // Join a chat room
  socket.on('joinRoom', (chatId) => {
    socket.join(chatId);
    console.log(`User with socket ${socket.id} joined chat room ${chatId}`);
  });
  
  // Leave a chat room
  socket.on('leaveRoom', (chatId) => {
    socket.leave(chatId);
    console.log(`User with socket ${socket.id} left chat room ${chatId}`);
  });

  // Request to get online users
  socket.on('getOnlineUsers', () => {
    socket.emit('onlineUsers', Array.from(onlineUsers));
  });

  // Send new messages
  socket.on('createChat', async (data) => {
    try {
        console.log('Initial message:', data);

        const { participants, initialMessage } = data;
        
        // Create new chat document
        const newChat = new Chat({
          participants,
          isActive: true
        });
        
        const savedChat = await newChat.save();
        
        // Create the first message
        const message = new Message({
          chat: savedChat._id,
          sender: participants[0], // Assuming the first participant is the sender
          content: initialMessage
        });
        
        const savedMessage = await message.save();
        
        // Update chat with last message
        savedChat.lastMessage = savedMessage._id;
        await savedChat.save();
        
        // Fetch complete user data for participants to return to client
        const populatedChat = await Chat.findById(savedChat._id)
          .populate('participants')
          .populate('lastMessage');
        
        // Notify both participants about the new chat
        participants.forEach(participantId => {
          const socketId = userSocketMap.get(participantId);
          if (socketId) {
            io.to(socketId).emit('chatCreated', populatedChat);
          }
        });
        
        // Emit the message to all participants
        io.to(savedChat._id.toString()).emit('newMessage', {
          ...savedMessage.toObject(),
          sender: {
            _id: participants[0],
          }
        });

        // Send notification to recipient if not the sender
        const recipient = participants.find(p => p.toString() !== participants[0].toString());
        if (recipient) {
          // Get sender details to create meaningful notification
          const sender = await User.findById(participants[0], 'firstName lastName');
          
          // Import notification controller here to avoid circular dependency
          const notificationController = require('../controllers/notificationController');
          
          await notificationController.createNotification({
            recipient,
            sender: participants[0],
            type: 'newMessage',
            content: `${sender.firstName} ${sender.lastName} sent you a message`,
            resourceId: savedChat._id,
            resourceModel: 'Chat'
          });
        }
        
        console.log(`New chat created: ${savedChat._id}`);
      } catch (error) {
        console.error('Error creating chat:', error);
        socket.emit('error', { message: 'Failed to create chat' });
      }
  });

  // Handle new messages
  socket.on('sendMessage', async (messageData) => {
    try {
      console.log('Received message:', messageData);
      
      // Create and save message to database
      const newMessage = new Message({
        chat: messageData.chat,
        sender: messageData.sender,
        content: messageData.content
      });
      
      const savedMessage = await newMessage.save();
      
      // Update the chat's lastMessage
      await Chat.findByIdAndUpdate(messageData.chat, {
        lastMessage: savedMessage._id
      });
      
      // Populate sender info for the frontend
      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('sender', 'firstName lastName profilePicture');
      
      // Broadcast to everyone in the chat room
      io.to(messageData.chat).emit(EVENTS.NEW_MESSAGE, populatedMessage);
      
      // Send notification to other participants who aren't in the room
      const chat = await Chat.findById(messageData.chat).populate('participants');
      
      if (chat) {
         // Get the sender's name
         const sender = await User.findById(messageData.sender, 'firstName lastName');

        // Get participants who should receive notifications
        // (excluding the sender)
        const recipientsToNotify = chat.participants.filter(
          participant => participant._id.toString() !== messageData.sender.toString()
        );
        console.log('📢 Users to be notified:', recipientsToNotify.map(r => r._id.toString()));
        
        // Import notification controller here to avoid circular dependency
        const notificationController = require('../controllers/notificationController');
        
        // Send notifications to these users
        for (const recipient of recipientsToNotify) {
            console.log('userscket',userSocketMap);
          const recipientSocketId = userSocketMap.get(recipient._id.toString());
          console.log(`🔍 Checking recipient ${recipient._id.toString()} - Socket ID: ${recipientSocketId}`);
          
          if (recipientSocketId) {
            // Check if they're in the room (if not, send notification)
            const recipientSocket = io.sockets.sockets.get(recipientSocketId);
            const isInRoom = recipientSocket?.rooms.has(messageData.chat);
            
            if (!isInRoom) {
              await notificationController.createNotification({
                recipient: recipient._id,
                sender: messageData.sender,
                type: 'newMessage',
                content: `${sender.firstName} ${sender.lastName} sent you a message: ${messageData.content.substring(0, 50)}${messageData.content.length > 50 ? '...' : ''}`,
                resourceId: messageData.chat,
                resourceModel: 'Chat'
              });
            }
          } else {
            // User is offline → Store notification for later retrieval
            await notificationController.createNotification({
              recipient: recipient._id,
              sender: messageData.sender,
              type: 'newMessage',
              content: `${sender.firstName} ${sender.lastName} sent you a message: ${messageData.content.substring(0, 50)}${messageData.content.length > 50 ? '...' : ''}`,
              resourceId: messageData.chat,
              resourceModel: 'Chat'
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    // Find and remove user from socket map
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        console.log(`User ${userId} disconnected`);
        userSocketMap.delete(userId);
        
        // Remove from online users
        onlineUsers.delete(userId);

        // Broadcast to ALL clients that this user disconnected
        io.emit('userDisconnected', userId);
        // Send updated online users list to ALL clients
        io.emit('onlineUsers', Array.from(onlineUsers));

        break;
      }
    }
  });
};