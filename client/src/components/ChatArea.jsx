import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, ArrowLeft, Users, Image, Smile } from "lucide-react";
import { io } from "socket.io-client";
import { userService } from "../utils/api";
import Profile from '../assets/proffile.jpg';
import ChatInfoModal from './ChatInfoModal';
import { useSelector } from "react-redux";

export default function ChatArea({ chat, currentUser, onBack, onChatCreated, onlineUsers }) {
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [localChat, setLocalChat] = useState(chat);
  const [showChatInfo, setShowChatInfo] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_BACKEND_URL); // Use your server URL
    setSocket(newSocket);

    // Clean up on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Update localChat when chat prop changes
  useEffect(() => {
    setLocalChat(chat);
  }, [chat]);

  // Fetch messages when chat changes
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        if (!localChat?._id) return;
        // Assuming you have an API endpoint to get messages for a chat
        const data = await userService.fetchMessages(localChat._id)
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    if (localChat?._id) {
      fetchMessages();
    }
  }, [localChat]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Connect and authenticate
    socket.on("connect", () => {
      console.log("Connected to socket server");
      // Identify the user
      socket.emit("userConnected", currentUser.id);
      
      // Join the chat room if it exists
      if (localChat?._id) {
        socket.emit("joinRoom", localChat._id);
      }
    });

    // Listen for new messages
    socket.on("newMessage", (newMessage) => {
      setMessages(prevMessages => [...prevMessages, newMessage]);
    });

    // Listen for chat creation event
    socket.on("chatCreated", (newChat) => {
      console.log("New chat created:", newChat);
      setLocalChat(newChat);
      // Update parent component if needed
      if (onChatCreated) {
        onChatCreated(newChat);
      }
      // Join the newly created room
      socket.emit("joinRoom", newChat._id);
    });

    return () => {
      // Leave the chat room when component unmounts
      if (socket && localChat?._id) {
        socket.emit("leaveRoom", localChat._id);
      }
      
      // Cleanup event listeners
      socket.off("connect");
      socket.off("newMessage");
      socket.off("chatCreated");
    };
  }, [socket, localChat, currentUser.id, onChatCreated]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !socket) return;
    
    try {
      // If no chat exists yet, create one first
      if (!localChat?._id) {
        const receiver = localChat.participants?.find(
          p => p !== currentUser.id
        );
        
        if (!receiver) {
          console.error("No receiver found");
          return;
        }
        
        // Emit event to create a new chat
        socket.emit("createChat", {
          participants: [currentUser.id, receiver],
          initialMessage: message
        });
        
        setMessage("");
        return;
      }
      
      // If chat already exists, proceed normally
      // Create message object based on your schema
      const messageData = {
        content: message,
        sender: currentUser.id,
        chat: localChat._id,
        createdAt: new Date().toISOString()
      };
      
      // Send message via socket
      socket.emit("sendMessage", messageData);
      
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Get other user in 1:1 chat or group info
  const getChatInfo = () => {
    if (!localChat) return { name: "", profilePicture: "", status: "offline" };

    // If it's a group chat
    if (localChat.participants?.length > 2) {
      return {
        name: localChat.name || "Group Chat",
        type: "group",
        profilePicture: localChat.profilePicture || "/placeholder.svg"
      };
    } else {
      // Find the other user in a 1:1 chat
      const otherUser = localChat.participants?.find(
        participant => participant._id !== currentUser.id
      );
      
      // Check if the other user is online (using onlineUsers prop)
      const isOnline = otherUser && onlineUsers.includes(otherUser._id);
      
      return {
        name: otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : "Chat",
        profilePicture: otherUser?.profilePicture || Profile,
        status: isOnline ? "online" : "offline",
        _id: otherUser?._id
      };
    }
  };

  const chatInfo = getChatInfo();

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-3rem)]">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 flex items-center shadow-md">
        <button 
          onClick={onBack} 
          className="mr-4 hover:bg-white/20 p-2 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center">
          {(localChat.participants?.length > 2) ? (
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mr-3">
              <Users className="w-6 h-6 text-white" onClick={() => setShowChatInfo(true)} />
            </div>
          ) : (
            <div className="relative" onClick={() => setShowChatInfo(true)}>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-indigo-400 rounded-full blur-sm opacity-70"></div>
              <img 
                src={chatInfo.profilePicture || "/placeholder.svg"} 
                alt={chatInfo.name}
                className="relative w-12 h-12 rounded-full mr-3 border-2 border-white/50 object-cover" 
              />
            </div>
          )}
          <div>
            <h2 className="font-bold text-lg">{chatInfo.name}</h2>
            {(!localChat.participants || localChat.participants?.length <= 2) && (
              <p className="text-sm opacity-90 flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${chatInfo.status === "online" ? "bg-green-400" : "bg-gray-300"}`}></span>
                {chatInfo.status === "online" ? "Online" : "Offline"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-4"
        style={{
          backgroundImage: "radial-gradient(circle at center, rgba(224, 231, 255, 0.2) 0%, rgba(249, 250, 251, 0) 80%)",
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        {messages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-400 text-center">
              {localChat._id 
                ? "No messages yet. Start the conversation!" 
                : "Send a message to start the conversation!"}
            </p>
          </div>
        )}
        
        {messages.map((msg, index) => {
          const isCurrentUser = msg.sender._id === currentUser.id;
          return (
            <div key={msg._id || index} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
              {!isCurrentUser && localChat.participants?.length > 2 && (
                <img 
                  src={msg.sender.profilePicture || Profile} 
                  alt={`${msg.sender.firstName} ${msg.sender.lastName}`} 
                  className="w-8 h-8 rounded-full mr-2 self-end mb-1" 
                />
              )}
              <div
                className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
                  isCurrentUser 
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white" 
                    : "bg-white border border-gray-100 text-gray-800"
                }`}
              >
                {localChat.participants?.length > 2 && !isCurrentUser && (
                  <p className="text-xs font-medium mb-1 text-indigo-600">{`${msg.sender.firstName} ${msg.sender.lastName}`}</p>
                )}
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 text-right ${isCurrentUser ? "text-white/70" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex items-center bg-gray-50 rounded-full p-1 shadow-sm border border-gray-100">
          <div className="flex space-x-1 px-2">
            <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors">
              <Paperclip size={18} />
            </button>
            <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors">
              <Image size={18} />
            </button>
            <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors">
              <Smile size={18} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-transparent rounded-full focus:outline-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            type="submit"
            className={`ml-2 p-3 rounded-full transition-all ${
              message.trim() 
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:scale-105" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            disabled={!message.trim()}
          >
            <Send size={18} className={message.trim() ? "transform -rotate-45" : ""} />
          </button>
        </form>
      </div>
      {showChatInfo && <ChatInfoModal chat={chat} onClose={() => setShowChatInfo(false)} />}
    </div>
  );
}