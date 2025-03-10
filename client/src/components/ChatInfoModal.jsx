import { X, Users } from "lucide-react"
import Profile from '../assets/proffile.jpg';
import { useSelector } from "react-redux";

export default function ChatInfoModal({ chat, onClose }) {
  const currentUser = useSelector((state) => state.auth.user);
  console.log('chat',chat);
  const otherParticipant =
    chat.type !== "group"
      ? chat.participants.find(participant => participant._id !== currentUser.id)
      : null;

  console.log(otherParticipant);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Chat Information</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center mb-4">
            {chat.type === "group" ? (
              <div className="h-16 w-16 bg-indigo-200 rounded-full flex items-center justify-center mr-4">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
            ) : (
              <img
                src={otherParticipant.profilePicture || Profile}
                alt={chat.name}
                className="h-16 w-16 rounded-full object-cover mr-4"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold">{chat.name}</h3>
              <p className="text-sm text-gray-500">{chat.type === "group" ? "Group" : "Individual Chat"}</p>
            </div>
          </div>

          {chat.type === "group" && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Members ({chat.members.length})</h4>
              <div className="max-h-40 overflow-y-auto">
                {chat.members.map((member) => (
                  <div key={member.id} className="flex items-center mb-2">
                    <img
                      src={member.avatar || "/placeholder.svg"}
                      alt={member.name}
                      className="h-8 w-8 rounded-full object-cover mr-2"
                    />
                    <span>{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {chat.type !== "group" && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">About</h4>
              <p className="text-sm text-gray-600">{otherParticipant.about || "No information available"}</p>
            </div>
          )}

          <div>
            <h4 className="font-medium mb-2">Created</h4>
            <p className="text-sm text-gray-600">{new Date(chat.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

