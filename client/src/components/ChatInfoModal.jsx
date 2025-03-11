import { X, Users } from "lucide-react";
import Profile from '../assets/proffile.jpg';
import { useSelector } from "react-redux";

export default function ChatInfoModal({ chat, onClose }) {
  const currentUser = useSelector((state) => state.auth.user);
  const otherParticipant =
    chat.type !== "group"
      ? chat.participants.find(participant => participant._id !== currentUser.id)
      : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-gradient-to-r from-indigo-300 to-purple-300 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full blur-3xl opacity-10 animate-pulse"></div>
      </div>
      
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Chat Information</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center mb-6">
            {chat.type === "group" ? (
              <div className="h-20 w-20 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mr-4 shadow-md">
                <Users className="h-10 w-10 text-white" />
              </div>
            ) : (
              <div className="relative h-20 w-20 mr-4">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full blur-sm opacity-70"></div>
                <img
                  src={otherParticipant?.profilePicture || Profile}
                  alt={chat.name}
                  className="relative h-20 w-20 rounded-full object-cover border-2 border-white"
                />
              </div>
            )}
            <div>
              <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">{chat.name}</h3>
              <p className="text-sm text-gray-500">{chat.type === "group" ? "Group" : "Individual Chat"}</p>
            </div>
          </div>

          {chat.type === "group" && (
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-indigo-700">Members ({chat.participants.length})</h4>
              <div className="max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-gray-100">
                {chat.participants.map((member) => (
                  <div key={member._id} className="flex items-center p-2 mb-2 rounded-lg hover:bg-indigo-50 transition-all">
                    <div className="relative h-10 w-10 mr-3">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-300 to-purple-300 rounded-full blur-sm opacity-50"></div>
                      <img
                        src={member.profilePicture || Profile}
                        alt={member.firstName}
                        className="relative h-10 w-10 rounded-full object-cover border-2 border-white"
                      />
                    </div>
                    <span className="font-medium text-gray-700">{member.firstName} {member.lastName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {chat.type !== "group" && (
            <div className="mb-6 bg-indigo-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-indigo-700">About</h4>
              <p className="text-gray-600">{otherParticipant?.about || "No information available"}</p>
            </div>
          )}

          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-purple-700">Created</h4>
            <p className="text-gray-600">{new Date(chat.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}