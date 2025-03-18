const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Fuse = require('fuse.js')
const Contact = require('../models/Contact');
const Chat = require("../models/Chat");
const Message = require('../models/Message');
const NotificationUtil = require('../utils/notificationUtil');

exports.search = async (req, res) => {
    try {
      const query = req.query.q; // Extract search query
      const currentUserId = req.user.id;
  
      // Fetch all users except the current user
      const users = await User.find({ _id: { $ne: currentUserId } });
  
      // Initialize Fuse.js for fuzzy search
      const fuse = new Fuse(users, {
        keys: ['firstName', 'lastName'], // Searching based on first and last name
        includeScore: true,
        threshold: 0.2, // Lower means stricter matching
      });
  
      // Perform fuzzy search
      const searchResults = query ? fuse.search(query).map(result => result.item) : users;
  
      // Get the user's contacts
      const contactIds = await Contact.find({
        userId: currentUserId
      }).distinct('contactId'); // Get IDs of contacts
  
      // Format response
      const formattedUsers = searchResults.slice(0, 20).map(user => ({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        isContact: contactIds.includes(user._id.toString()), // Check if user is a contact
      }));
  
      res.json(formattedUsers);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
};

exports.sendRequest = async (req, res) => {
    try {
      const { recipientId } = req.body;
      const senderId = req.user.id;

      // Check if users are already friends (both directions)
      const existingContact = await Contact.findOne({
        $or: [
            { userId: senderId, contactId: recipientId },
            { userId: recipientId, contactId: senderId }
          ]
      });

      if (existingContact) {
          return res.status(400).json({ error: 'You are already friends' });
      }
      
      // Check if request already exists
      const existingRequest = await FriendRequest.findOne({
        sender: senderId,
        recipient: recipientId,
        status: { $in: ['pending', 'accepted'] }
      });
      
      if (existingRequest) {
        return res.status(400).json({ error: 'Friend request already exists' });
      }
      
      // Create new request
      const newRequest = new FriendRequest({
        sender: senderId,
        recipient: recipientId,
        status: 'pending',
        createdAt: new Date()
      });
      
      await newRequest.save();

      await NotificationUtil.createFriendRequestNotification(senderId, recipientId);

      res.status(201).json({ message: 'Friend request sent' });
    } catch (error) {
      console.error('Friend request error:', error);
      res.status(500).json({ error: 'Failed to send friend request' });
    }
};

exports.pending = async (req, res) => {
    try {
      const userId = req.user.id;
      
      const pendingRequests = await FriendRequest.find({
        sender: userId,
        status: 'pending'
      });
      
      res.json(pendingRequests);
    } catch (error) {
      console.error('Fetch pending requests error:', error);
      res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
};

exports.fetchAllFriends = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all contacts where the user is either userId or contactId
        const friends = await Contact.find({ contactId: userId })
        .populate('userId', 'firstName lastName profilePicture')
        .populate('contactId', 'firstName lastName profilePicture');

        // Format the response
        const formattedFriends = friends.map(contact => {
            // Determine which field holds the friend's details
            const friend = contact.userId._id.toString() === userId
                ? contact.contactId // If logged-in user is userId, return contactId
                : contact.userId;   // Otherwise, return userId

            return {
                id: friend._id,
                firstName: friend.firstName,
                lastName: friend.lastName,
                profilePicture: friend.profilePicture
            };
        });

        res.status(200).json(formattedFriends);
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
};

exports.fetchFriendRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find friend requests where the logged-in user is the recipient
        const friendRequests = await FriendRequest.find({ recipient: userId, status: "pending" })
            .populate("sender", "firstName lastName profilePicture");

        // Get the list of friends for the logged-in user
        const userFriends = await Contact.find({ 
            $or: [{ userId: userId }, { contactId: userId }],
            status: "accepted"
        });

        const userFriendIds = new Set(userFriends.map(contact =>
            contact.userId.toString() === userId ? contact.contactId.toString() : contact.userId.toString()
        ));

        // Format friend requests and calculate mutual friends
        const formattedRequests = await Promise.all(friendRequests.map(async (request) => {
            const requesterId = request.sender._id.toString();

            // Get the list of friends for the requester
            const requesterFriends = await Contact.find({ 
                $or: [{ userId: requesterId }, { contactId: requesterId }],
                status: "accepted"
            }) || [];

            const requesterFriendIds = new Set(requesterFriends.map(contact =>
                contact.userId.toString() === requesterId ? contact.contactId.toString() : contact.userId.toString()
            ));

            // Find mutual friends (intersection of both sets)
            const mutualFriendsCount = [...userFriendIds].filter(id => requesterFriendIds.has(id)).length;

            return {
                id: requesterId,
                firstName: request.sender.firstName,
                lastName: request.sender.lastName,
                profilePicture: request.sender.profilePicture,
                mutualFriends: mutualFriendsCount
            };
        }));

        res.status(200).json(formattedRequests);
    } catch (error) {
        console.error("Error fetching friend requests:", error);
        res.status(500).json({ error: "Failed to fetch friend requests" });
    }
};

exports.acceptRequest = async (req, res) => {
    try {
        const { senderId } = req.body;
        const recipientId = req.user.id;
        console.log('reci',recipientId);

        // Find the friend request and verify recipient
        const friendRequest = await FriendRequest.findOne({
            sender: senderId,
            recipient: recipientId
        });
        if (!friendRequest) {
            return res.status(404).json({ error: 'Friend request not found' });
        }
        console.log('req',friendRequest);

        // Verify this user is the recipient of the request
        if (friendRequest.recipient.toString() !== recipientId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Update request status
        friendRequest.status = "accepted";
        await friendRequest.save();

        // Create contact entries for both users (using your Contact model)
        await Contact.create({
            userId: recipientId,
            contactId: senderId
        });
        
        await Contact.create({
            userId: senderId,
            contactId: recipientId
        });

        // Create notification for the requester
        await NotificationUtil.createFriendAcceptedNotification(senderId, recipientId);

        res.status(200).json({ message: "Friend request accepted!" });
    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ error: 'Failed to accept friend request' });
    }
};

exports.rejectRequest = async (req, res) => {
    try {
        const { senderId } = req.body; 
        const recipientId = req.user.id;

        // Find the friend request and verify recipient
        const friendRequest = await FriendRequest.findOne({sender: senderId});
        if (!friendRequest) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        // Verify this user is the recipient of the request
        if (friendRequest.recipient.toString() !== recipientId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Update request status to rejected
        friendRequest.status = "rejected";
        await friendRequest.save();

        res.status(200).json({ message: "Friend request rejected" });
    } catch (error) {
        console.error('Friend request rejection error:', error);
        res.status(500).json({ error: 'Failed to reject friend request' });
    }
};

exports.getChats = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming user ID is available from authentication middleware

        // Find all chats where the user is a participant
        const chats = await Chat.find({ participants: userId })
            .populate({
                path: "participants",
                select: "firstName lastName profilePicture about", // Select relevant fields
            })
            .populate({
                path: "lastMessage",
                select: "content sender createdAt",
                populate: {
                    path: "sender",
                    select: "firstName lastName profilePicture about", // Populate sender details
                }
            })
            .sort({ updatedAt: -1 });
        
        res.status(200).json({
            success: true,
            chats,
        });
    } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

exports.createChat = async (req, res) => {
  try {
    const { participants, type } = req.body;

    // Validate that exactly two participants are provided for individual chat
    if (type === 'individual' && participants.length !== 2) {
      return res.status(400).json({ message: "Individual chat must have exactly 2 participants." });
    }

    // Check if the chat already exists between these two users (for individual chat)
    if (type === 'individual') {
      const existingChat = await Chat.findOne({ 
        type: 'individual', 
        participants: { $all: participants }
      }).populate('participants');

      if (existingChat) {
        return res.status(200).json({ message: "Chat already exists", chat: existingChat });
      }
    }

    // Create a new chat
    const newChat = await Chat.create({
      participants,
      type,
    });

    const populatedChat = await Chat.findById(newChat._id).populate('participants');

    return res.status(201).json({ message: "Chat created successfully", chat: populatedChat });
  } catch (error) {
    console.error("Error creating chat:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        // Fetch messages for the given chat ID, sorted by createdAt (oldest first)
        const messages = await Message.find({ chat: chatId })
            .populate("sender", "firstName lastName profilePicture") // Populate sender details
            .sort({ createdAt: 1 }); // Sort by creation time

        res.status(200).json(messages);
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.createGroupChat = async (req, res) => {
    try {
        const { participants, groupName } = req.body;
        const creatorId = req.user._id; 

        // Validate input
        if (!participants || !Array.isArray(participants) || participants.length < 1) {
            return res.status(400).json({ message: "A group chat must have at least one other participant." });
        }

        if (!groupName || groupName.trim() === "") {
            return res.status(400).json({ message: "Group chat must have a name." });
        }

        // Ensure the creator is included in the participants list
        const uniqueParticipants = [...new Set([...participants, creatorId])];

        // Create a new group chat
        const newGroupChat = await Chat.create({
            participants: uniqueParticipants,
            type: 'group',
            name: groupName,
        });

        // Populate participants before returning response
        const populatedGroupChat = await Chat.findById(newGroupChat._id).populate('participants');

        return res.status(201).json({ message: "Group chat created successfully", chat: populatedGroupChat });
    } catch (error) {
        console.error("Error creating group chat:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
  
