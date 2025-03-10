import { UserPlus, Check, X } from "lucide-react";
import Profile from '../assets/proffile.jpg'
import { friendService } from "../utils/api";

export default function FriendRequestsArea({ requests, setFriendRequests, setContacts }) {

  const handleAccept = async (senderId) => {
    console.log("Accepted request:", senderId)
    try {
      const response = await friendService.acceptRequest(senderId);

      setFriendRequests((prev) => prev.filter((req) => req.id !== senderId));
      setContacts((prev) => [...prev, { id: senderId }]);
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  }

  const handleReject = async (senderId) => {
    console.log("Rejected request:", senderId);
    try {
      await friendService.rejectRequest(senderId);
      setFriendRequests((prev) => prev.filter((req) => req.id !== senderId));
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  return (
    <div className="h-full bg-white rounded-lg shadow p-6 overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-6 flex items-center">
        <UserPlus className="mr-2" /> Friend Requests
      </h2>
      {requests.length === 0 ? (
        <p className="text-gray-500">No pending friend requests</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <li key={request.id} className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src={request.profilePicture || Profile}
                  alt={`${request.firstName} ${request.lastName}`}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h3 className="font-medium">{request.firstName} {request.lastName}</h3>
                  <p className="text-sm text-gray-500">{request.mutualFriends || 0} mutual friends</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAccept(request.id)}
                  className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
