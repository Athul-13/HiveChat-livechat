import { Users, MessageSquare } from "lucide-react";
import Profile from '../assets/proffile.jpg';
import { userService } from "../utils/api";
import { useSelector } from "react-redux";

export default function FriendsArea({ friends, onChatSelect, onlineUsers }) {
  const currentUser = useSelector((state) => state.auth.user);

  return (
      <div className="h-full bg-white rounded-lg shadow p-6 overflow-y-auto">
          <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Users className="mr-2" /> Friends
          </h2>

          {friends.length === 0 ? (
              <p className="text-gray-500 text-center">No friends yet</p>
          ) : (
              <ul className="space-y-4">
                  {friends.map((friend) => {
                      const isOnline = onlineUsers.includes(friend.id); // Check if friend is online
                      return (
                          <li
                              key={friend.id}
                              className="bg-gray-50 p-4 rounded-lg flex items-center justify-between"
                          >
                              <div className="flex items-center">
                                  <img
                                      src={friend.profilePicture || Profile}
                                      alt={`${friend.firstName} ${friend.lastName}`}
                                      className="w-12 h-12 rounded-full mr-4"
                                  />
                                  <div>
                                      <h3 className="font-medium">
                                          {friend.firstName} {friend.lastName}
                                      </h3>
                                      <p
                                          className={`text-sm ${
                                              isOnline ? "text-green-500" : "text-gray-500"
                                          }`}
                                      >
                                          {isOnline ? "Online" : "Offline"}
                                      </p>
                                  </div>
                              </div>
                              <button
                                  onClick={async () => {
                                      const newChat = await userService.createChat({
                                          participants: [currentUser.id, friend.id],
                                          type: "individual",
                                      });
                                      onChatSelect(newChat.chat);
                                  }}
                                  className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200"
                              >
                                  <MessageSquare size={20} />
                              </button>
                          </li>
                      );
                  })}
              </ul>
          )}
      </div>
  );
}
