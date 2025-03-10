"use client"

import { useState } from "react"
import { X, Search, UserPlus, Check } from "lucide-react"

// Mock data for demonstration
const mockUsers = [
  { id: "user1", name: "Jane Smith", avatar: "/placeholder.svg?height=100&width=100", isFriend: false },
  { id: "user2", name: "Robert Johnson", avatar: "/placeholder.svg?height=100&width=100", isFriend: true },
  { id: "user3", name: "Emily Davis", avatar: "/placeholder.svg?height=100&width=100", isFriend: false },
  { id: "user4", name: "Michael Wilson", avatar: "/placeholder.svg?height=100&width=100", isFriend: false },
  { id: "user5", name: "Sarah Brown", avatar: "/placeholder.svg?height=100&width=100", isFriend: true },
]

export default function UserSearchModal({ onClose }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [sentRequests, setSentRequests] = useState({})

  const handleSearch = (e) => {
    e.preventDefault()
    // In a real app, you would call your API to search for users
    // For demo purposes, we'll filter the mock users
    const results = mockUsers.filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()))
    setSearchResults(results)
  }

  const handleSendRequest = (userId) => {
    // In a real app, you would call your API to send a friend request
    console.log("Sending friend request to:", userId)
    setSentRequests((prev) => ({ ...prev, [userId]: true }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Find Users</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search for users..."
                className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-indigo-600 text-white text-sm rounded-full hover:bg-indigo-700"
              >
                Search
              </button>
            </div>
          </form>

          <div className="max-h-96 overflow-y-auto">
            {searchResults.length === 0 ? (
              searchQuery ? (
                <p className="text-center text-gray-500 py-4">No users found</p>
              ) : (
                <p className="text-center text-gray-500 py-4">Search for users to add as friends</p>
              )
            ) : (
              <div className="space-y-4">
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src={user.avatar || "/placeholder.svg"}
                        alt={user.name}
                        className="h-12 w-12 rounded-full object-cover mr-3"
                      />
                      <div>
                        <h3 className="font-medium">{user.name}</h3>
                      </div>
                    </div>

                    <div>
                      {user.isFriend ? (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full flex items-center">
                          <Check size={14} className="mr-1" /> Friends
                        </span>
                      ) : sentRequests[user.id] ? (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                          Request Sent
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(user.id)}
                          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-full hover:bg-indigo-700 flex items-center"
                        >
                          <UserPlus size={14} className="mr-1" /> Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

