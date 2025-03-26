import React from 'react';
import { 
  MessageCircle, 
  Bell, 
  UserPlus, 
  Users, 
  Settings, 
  Search, 
  User 
} from 'lucide-react';
import logo from "../assets/logo.png"; 
import Profile from "../assets/proffile.jpg";

// Mobile Bottom Navigation Component
export const MobileBottomNavigation = ({ 
  isMobile,
  activeSection, 
  onSectionChange, 
  notificationCount, 
  friendRequestCount 
}) => {
  const navItems = [
    { 
      section: "chats", 
      icon: MessageCircle, 
      label: "Chats" 
    },
    { 
      section: "notifications", 
      icon: Bell, 
      label: "Notifications",
      count: notificationCount 
    },
    { 
      section: "friendRequests", 
      icon: UserPlus, 
      label: "Requests",
      count: friendRequestCount 
    },
    { 
      section: "friends", 
      icon: Users, 
      label: "Contacts" 
    },
    { 
      section: "settings", 
      icon: Settings, 
      label: "Settings" 
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 z-50 md:hidden h-16 flex items-center">
      <div className="grid grid-cols-5 w-full">
        {navItems.map((item) => (
          <button
            key={item.section}
            onClick={() => onSectionChange(item.section)}
            className={`
              group relative flex flex-col items-center justify-center py-2 
              transition-all duration-300
              ${activeSection === item.section 
                ? 'bg-white text-indigo-600 transform scale-110' 
                : 'text-white hover:bg-white/20'}
            `}
          >
            <item.icon 
              className={`w-6 h-6 ${
                activeSection === item.section ? 'text-indigo-600' : 'text-white'
              }`} 
            />
            <span className={`text-xs mt-1 ${
              activeSection === item.section ? 'text-indigo-600' : 'text-white'
            }`}>
              {item.label}
            </span>
            
            {/* Notification badge */}
            {item.count > 0 && (
              <span className="absolute -top-1 right-1/4 bg-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Mobile Top Bar Component
export const MobileTopBar = ({ 
  currentUser, 
  onProfileClick, 
  onSearchClick 
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 z-50 md:hidden h-16 flex items-center">
      <div className="flex justify-between items-center p-4 w-full">
        <div className="flex items-center">
        <img 
            src={logo} 
            alt="HiveChat Logo" 
            className="h-16 w-auto mr-2" 
          />
          <h1 className="text-lg font-semibold text-white">HiveChat</h1>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={onSearchClick} 
            className="text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-300"
          >
            <Search size={24} />
          </button>
          <button 
            onClick={onProfileClick} 
            className="p-0.5 rounded-full transition-all duration-300 hover:bg-gradient-to-r from-pink-500 to-indigo-500"
          >
            <div className="p-0.5 bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full">
              <img 
                src={currentUser.profilePicture || Profile} 
                alt={`${currentUser.FirstName} ${currentUser.lastName}`} 
                className="w-10 h-10 rounded-full border-2 border-white" 
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};