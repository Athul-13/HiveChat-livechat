import { Users, Search, PlusCircle } from "lucide-react";
import Profile from '../assets/proffile.jpg'
import { useState } from "react";
import CreateGroupModal from "./CreateGroupModal";
import { useSelector } from "react-redux";

export default function ChatList({ chats, onChatSelect, activeChat, onNewChat, contacts, onlineUsers }) {
  const [showCreateGroup, setShowcreateGroup] = useState(false);
  
  const currentUser = useSelector((state) => state.auth.user);

  return (
    <div className="h-full flex flex-col">
      {/* Search and New Chat */}
      <div className="p-4">
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <button className="w-full flex items-center justify-center space-x-2 py-2 mb-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-md transition-shadow"
        onClick={() => onNewChat('friends')}>
          <PlusCircle size={16} />
          <span className="font-medium text-sm">New Conversation</span>
        </button>
        <button className="w-full flex items-center justify-center space-x-2 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-md transition-shadow"
        onClick={() => setShowcreateGroup(true)}>
          <PlusCircle size={16} />
          <span className="font-medium text-sm">New Group</span>
        </button>
      </div>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Conversations</h3>
        </div>
        <div>
          {chats.map((chat) => {
            const isOnline = chat.participants && chat.participants.some(participant => 
              participant._id !== currentUser.id && onlineUsers.includes(participant._id)
            );
            return (
            <button
              key={chat._id}
              className={`w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center transition-colors ${
                activeChat && activeChat._id === chat._id 
                  ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-r-4 border-indigo-500" 
                  : ""
              }`}
              onClick={() => onChatSelect(chat)}
            >
              <div className="relative mr-3">
                {chat.type === "group" ? (
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                ) : (
                  <div className="relative">
                    <div className={`absolute inset-0 rounded-full ${
                      activeChat && activeChat._id === chat._id 
                        ? "bg-gradient-to-r from-indigo-300/30 to-purple-300/30 blur-sm" 
                        : ""
                    }`}></div>
                    <img
                      src={chat.profilePicture || Profile}
                      alt={chat.name}
                      className="relative w-12 h-12 rounded-full object-cover border border-gray-100"
                    />
                  </div>
                )}
                {chat.type !== "group" &&  isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                )}
                {/* {chat.unread > 0 && chat.type === "group" && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{chat.unread}</span>
                  </span>
                )} */}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className={`text-sm font-medium truncate ${
                    chat.unread > 0 ? "text-indigo-900 font-semibold" : "text-gray-800"
                  }`}>
                    {chat.name}
                  </h3>
                  {chat.lastMessage && (
                  <span className={`text-xs ${
                    chat.unread > 0 ? "text-indigo-600 font-semibold" : "text-gray-500"
                  }`}>
                    {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { 
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                </div>
                {chat.lastMessage && (
                  <p className={`text-xs truncate ${
                    chat.unread > 0 ? "text-gray-900" : "text-gray-500"
                  }`}>
                    {chat.type === "group" ? `${chat.lastMessage.sender.firstName}: ` : ""}
                    {chat.lastMessage.content} 
                  </p>
                )}
               </div>
              {/* {chat.unread > 0 && chat.type !== "group" && (
                <span className="ml-2 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">{chat.unread}</span>
                </span>
              )} */}
            </button>
          )})}
        </div>
      </div>
      {showCreateGroup && < CreateGroupModal contacts={contacts} onClose={() => setShowcreateGroup(false)} onChatSelect={onChatSelect} />}
    </div>
  );
}