import { useState, useEffect } from "react"
import { Search, MessageSquare, UserPlus, Check, Loader2 } from "lucide-react"
import { userService } from "../utils/api" 
import Profile from '../assets/proffile.jpg'
import toast from "react-hot-toast"

export default function SearchArea({ onChatSelect }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [pendingRequests, setPendingRequests] = useState({}) // Track pending friend requests
  
  // Debounce function to prevent too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch any existing pending requests
  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const requests = await userService.getPendingFriendRequests();
        const pendingMap = {};
        requests.forEach(req => {
          pendingMap[req.recipient] = true;
        });
        setPendingRequests(pendingMap);
      } catch (error) {
        console.error("Failed to fetch pending requests:", error);
      }
    };
    
    fetchPendingRequests();
  }, []);

  const performSearch = async (query) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      // API call to your backend search endpoint
      const results = await userService.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      // Handle error state
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const sendFriendRequest = async (userId) => {
    try {
      // Mark this request as pending immediately for UI feedback
      setPendingRequests(prev => ({ ...prev, [userId]: true }));
      
      // Send the friend request to the backend
      await userService.sendFriendRequest(userId);
      
      toast.success('Successfully sent request')
    } catch (error) {
      // If request fails, revert the pending state
      console.error("Failed to send friend request:", error);
      setPendingRequests(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      toast.error('Failed to send request')
    }
  };

  return (
    <div className="h-full bg-white rounded-lg shadow p-6 overflow-y-auto">
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users to connect with..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center my-4">
          <Loader2 className="animate-spin h-6 w-6 text-indigo-500" />
        </div>
      )}
      
      {/* Search results */}
      {searchQuery && !isLoading && (
        <p className="text-sm text-gray-500 mb-4">
          Found {searchResults.length} {searchResults.length === 1 ? 'user' : 'users'} for "{searchQuery}"
        </p>
      )}
      
      {/* Results list */}
      <ul className="space-y-4">
        {searchResults.map((user) => (
            <li key={user.id} className="bg-gray-50 p-4 rounded-lg flex items-center justify-between hover:bg-gray-100 transition-colors">
            <div className="flex items-center">
                <img src={user.profilePicture || Profile} alt={`${user.firstName} ${user.lastName}`} className="w-12 h-12 rounded-full mr-4" />
                <div>
                <h3 className="font-medium">{user.firstName} {user.lastName}</h3>
                <p className="text-sm text-gray-500">{user.status || 'User'}</p>
                </div>
            </div>
            <div className="flex gap-2">
                {user.isContact ? (
                <button
                    onClick={() => onChatSelect({ id: user.id, name: `${user.firstName} ${user.lastName}`, avatar: user.profilePicture, type: "individual" })}
                    className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
                    title="Send message"
                >
                    <MessageSquare size={20} />
                </button>
                ) : pendingRequests[user.id] ? (
                <button
                    className="p-2 bg-green-100 text-green-600 rounded-full cursor-default"
                    title="Contact request sent"
                    disabled
                >
                    <Check size={20} />
                </button>
                ) : (
                <button
                    onClick={() => sendFriendRequest(user.id)}
                    className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
                    title="Send contact request"
                >
                    <UserPlus size={20} />
                </button>
                )}
            </div>
            </li>
        ))}

        {searchQuery && !isLoading && searchResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
            <p>No users found matching "{searchQuery}"</p>
            </div>
        )}
        </ul>

    </div>
  );
}