import { Bell, UserPlus, MessageSquare, Search, Users, Settings } from "lucide-react";
import Profile from "../assets/proffile.jpg";

export default function Sidebar({
  activeSection,
  onSectionChange,
  currentUser,
  notificationCount,
  friendRequestCount,
}) {
  const navItems = [
    { id: "chats", icon: MessageSquare, label: "Chats" },
    { id: "notifications", icon: Bell, count: notificationCount, label: "Notifications" },
    { id: "friendRequests", icon: UserPlus, count: friendRequestCount, label: "Requests" },
    { id: "search", icon: Search, label: "Search" },
    { id: "friends", icon: Users, label: "Friends" },
  ];

  return (
    <nav className="w-20 md:w-24 bg-gradient-to-b from-indigo-600 via-purple-500 to-indigo-700 flex flex-col items-center py-6 rounded-l-xl shadow-xl">
      {/* App logo at top */}
      <div className="mb-8">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 text-xl font-bold">HC</span>
        </div>
      </div>

      {/* Navigation items */}
      <div className="space-y-6 flex flex-col items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`group relative p-3 rounded-xl transition-all duration-300 ${
              activeSection === item.id 
                ? "bg-white text-indigo-600 shadow-md transform scale-110" 
                : "text-white hover:bg-white/20"
            }`}
            onClick={() => onSectionChange(item.id)}
            title={item.label}
          >
            <item.icon className={`w-6 h-6 ${activeSection === item.id ? "text-indigo-600" : "text-white"}`} />
            
            {/* Notification badge */}
            {item.count > 0 && (
              <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                {item.count}
              </span>
            )}
            
            {/* Tooltip */}
            <span className="absolute left-full ml-2 px-2 py-1 bg-indigo-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-10">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Bottom section with settings and profile */}
      <div className="mt-auto flex flex-col items-center gap-6 mb-4">
        <button
          className={`group relative p-3 rounded-xl transition-all duration-300 ${
            activeSection === "settings" 
              ? "bg-white text-indigo-600 shadow-md transform scale-110" 
              : "text-white hover:bg-white/20"
          }`}
          onClick={() => onSectionChange("settings")}
          title="Settings"
        >
          <Settings className={`w-6 h-6 ${activeSection === "settings" ? "text-indigo-600" : "text-white"}`} />
          
          {/* Tooltip */}
          <span className="absolute left-full ml-2 px-2 py-1 bg-indigo-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-10">
            Settings
          </span>
        </button>

        <button
          className={`group relative p-0.5 rounded-full transition-all duration-300 ${
            activeSection === "profile" 
              ? "bg-gradient-to-r from-pink-500 to-indigo-500 transform scale-110" 
              : "bg-white/20 hover:bg-white/30"
          }`}
          onClick={() => onSectionChange("profile")}
          title="Profile"
        >
          <div className="p-0.5 bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full">
            <img 
              src={currentUser.profilePicture || Profile} 
              alt={`${currentUser.FirstName} ${currentUser.lastName}`} 
              className="w-10 h-10 rounded-full border-2 border-white" 
            />
          </div>
          
          {/* Tooltip */}
          <span className="absolute left-full ml-2 px-2 py-1 bg-indigo-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-10">
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
}