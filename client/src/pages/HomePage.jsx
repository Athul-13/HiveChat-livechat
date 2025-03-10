import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/authSlice";
import { useNavigate } from "react-router-dom";
import { authService, notificationService, userService } from "../utils/api";
import logo from "../assets/logo.png"; 
import socket from "../utils/socket"; // Import your socket instance

import Loader from "../components/Loader";

import ChatList from "../components/ChatList";
import NotificationsArea from "../components/NotificationArea";
import FriendRequestsArea from "../components/FriendRequestArea";
import SearchArea from "../components/SearchArea";
import FriendsArea from "../components/FriedndsArea";
import SettingsArea from "../components/SettingsArea";
import ProfileArea from "../components/ProfileArea";
import ChatArea from "../components/ChatArea";
import Sidebar from "../components/Sidebar";

export default function Homepage() {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("chats");
  const [activeChat, setActiveChat] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [chats, setChats] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentUser = useSelector((state) => state.auth.user);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [friends, friendRequests, chatList, notificationsData, unreadCount] = await Promise.all([
          userService.fetchFriends(),        
          userService.getFriendRequests(),
          userService.getChats(), 
          notificationService.getUserNotifications(),
          notificationService.getUnreadNotificationCount()
        ]);
  
        setContacts(friends);      
        setFriendRequests(friendRequests);
        setNotifications(notificationsData);
        setUnreadNotificationCount(unreadCount.count);
        
        // Process chats to include necessary info
        const processedChats = await Promise.all(chatList.chats.map(async (chat) => {
          // Fetch the last message for each chat
          try {
            const lastMsg = chat.lastMessage || null;
            
            // Get populated participants
            const populatedParticipants = chat.participants || [];
              
            // Find the other user in a 1:1 chat
            let otherUser = null;
            if (populatedParticipants.length === 2) {
              otherUser = populatedParticipants.find(
                participant => participant._id !== currentUser.id
              );
            }
            
            return {
                ...chat,
                participants: populatedParticipants,
                lastMessage: lastMsg,
                name: chat.type === "group" ? chat.name : `${otherUser.firstName} ${otherUser.lastName}`,
                profilePicture: chat.type === "group" ? chat.groupProfilePicture || null : otherUser?.profilePicture || null,
                status: chat.type === "group" ? null : otherUser?.status || "offline",
                type: populatedParticipants.length > 2 ? "group" : "direct"
              };
          } catch (error) {
            console.error("Error processing chat:", error);
            return chat;
          }
        }));
        
        setChats(processedChats);
  
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    const timeout = setTimeout(() => {
        fetchData();
      }, 1000);
    
    return () => clearTimeout(timeout);
  }, [currentUser.id]);

  // Set up socket listeners for real-time updates
  useEffect(() => {
    if (!currentUser.id) return;
  
    // Connect to socket
    socket.connect(); // Make sure the socket is connected
    socket.emit('userConnected', currentUser.id);
  
    // Listen for new notifications
    const handleNewNotification = (notification) => {
    //   console.log('New notification received:', notification); 
      setNotifications(prev => [notification, ...prev]);
      setUnreadNotificationCount(prev => prev + 1);
    };
  
    // Listen for unread count updates
    const handleUnreadCount = (data) => {
    //   console.log('Unread count update:', data); 
      setUnreadNotificationCount(data.count);
    };
  
    socket.on('newNotification', handleNewNotification);
    socket.on('unreadNotificationsCount', handleUnreadCount);
  
    // Clean up event listeners when component unmounts
    return () => {
      socket.off('newNotification', handleNewNotification);
      socket.off('unreadNotificationsCount', handleUnreadCount);
      // Only disconnect if you're not using the socket elsewhere
      // socket.disconnect();
    };
  }, [currentUser.id]);

  const handleLogout = async () => {
    await authService.logout();
    await dispatch(logout());
    navigate("/");
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setActiveChat(null);
  };

  const handleChatSelect = (chat) => {
    setActiveChat(chat);
  };

  const handleProfileUpdate = (updatedProfile) => {
    // Update profile logic
  };

  const renderSideContent = () => {
    switch (activeSection) {
      case "chats":
        return <ChatList chats={chats} onChatSelect={handleChatSelect} activeChat={activeChat} onNewChat={handleSectionChange} contacts={contacts} />;
      case "notifications":
        return <NotificationsArea notifications={notifications} setNotifications={setNotifications} setUnreadCount={setUnreadNotificationCount} />;
      case "friendRequests":
        return <FriendRequestsArea requests={friendRequests} setFriendRequests={setFriendRequests} setContacts={setContacts} />;
      case "search":
        return <SearchArea onChatSelect={handleChatSelect} />;
      case "friends":
        return <FriendsArea friends={contacts} onChatSelect={handleChatSelect} />;
      case "settings":
        return <SettingsArea currentUser={currentUser} onLogout={handleLogout} />;
      case "profile":
        return <ProfileArea currentUser={currentUser} onUpdate={handleProfileUpdate} />;
      default:
        return null;
    }
  };

  if (loading) {
    return <Loader />;
  }

  const getSectionTitle = () => {
    const titles = {
      chats: "Recent Conversations",
      notifications: "Notifications",
      friendRequests: "Friend Requests",
      search: "Search",
      friends: "Friends",
      settings: "Settings",
      profile: "My Profile"
    };
    return titles[activeSection] || "HiveChat";
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden scrollbar-thin">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-gradient-to-r from-indigo-300 to-purple-300 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full blur-3xl opacity-10 animate-pulse"></div>
      </div>

      {/* App Container */}
      <div className="flex w-full p-4 md:p-6 overflow-hidden scrollbar-thin">
        {/* Sidebar */}
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          currentUser={currentUser}
          notificationCount={unreadNotificationCount}
          friendRequestCount={friendRequests.length}
        />

        {/* Main Content */}
        <div className="flex flex-1 bg-white rounded-r-xl shadow-xl overflow-hidden scrollbar-thin">
          {/* Left Panel */}
          <div className="flex-[1.5] border-r border-gray-100 overflow-hidden flex flex-col scrollbar-thin">
            <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <h2 className="text-xl font-semibold">{getSectionTitle()}</h2>
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              {renderSideContent()}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-[3] overflow-hidden flex flex-col">
            {activeChat ? (
              <ChatArea chat={activeChat} currentUser={currentUser} onBack={() => setActiveChat(null)} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="relative w-52 h-52 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full blur-md opacity-70"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src={logo} alt="HiveChat Logo" className="max-w-48 h-auto mb-4" /> 
                  </div>
                </div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 mb-4">
                  Welcome to HiveChat
                </h1>
                <p className="text-gray-500 max-w-md">
                  Select a conversation to start chatting or connect with new friends through the sidebar options.
                </p>
                
                {activeSection === "chats" && (
                  <button 
                    className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    onClick={() => handleSectionChange("search")}
                  >
                    Start a New Chat
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}