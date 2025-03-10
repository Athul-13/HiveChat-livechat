import { Users } from "lucide-react"

export default function ContactList({ contacts, chats, activeChat, onChatSelect }) {
  // Combine contacts and chats for display
  const chatItems = chats.map((chat) => {
    // For group chats
    if (chat.type === "group") {
      return {
        ...chat,
        isActive: false,
        lastMessage: chat.messages[chat.messages.length - 1],
      }
    }

    // For individual chats, find the contact
    const contact = contacts.find((c) => c.id === chat.participants[0])
    return {
      ...chat,
      name: contact?.name || "Unknown",
      avatar: contact?.avatar || "/placeholder.svg?height=40&width=40",
      status: contact?.status || "offline",
      lastMessage: chat.messages[chat.messages.length - 1],
    }
  })

  return (
    <div className="divide-y">
      {chatItems.map((chat) => (
        <div
          key={chat.id}
          className={`flex items-center p-4 hover:bg-indigo-50 cursor-pointer ${activeChat?.id === chat.id ? "bg-indigo-100" : ""}`}
          onClick={() => onChatSelect(chat)}
        >
          <div className="relative mr-3">
            {chat.type === "group" ? (
              <div className="h-12 w-12 bg-indigo-200 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
            ) : (
              <img
                src={chat.avatar || "/placeholder.svg"}
                alt={chat.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            )}

            {chat.type !== "group" && (
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${chat.status === "online" ? "bg-green-500" : "bg-gray-300"}`}
              ></span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-medium truncate">{chat.name}</h3>
              {chat.lastMessage && (
                <span className="text-xs text-gray-500">
                  {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            {chat.lastMessage && (
              <p className="text-xs text-gray-500 truncate">
                {chat.type !== "group" ? "" : `${chat.lastMessage.sender.name}: `}
                {chat.lastMessage.text}
              </p>
            )}
          </div>

          {chat.unreadCount > 0 && (
            <span className="ml-2 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {chat.unreadCount}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

