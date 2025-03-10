import { Settings, LogOut } from "lucide-react"
import Profile from "../assets/proffile.jpg"

export default function SettingsArea({ currentUser, onLogout }) {
  return (
    <div className="h-full bg-white rounded-lg p-6 overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-6 flex items-center text-indigo-600">
        <Settings className="mr-2 text-purple-500" /> Settings
      </h2>
      <div className="mb-6">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full blur-sm opacity-50"></div>
          <img
            src={currentUser.profilePicture || Profile}
            alt={`${currentUser.firstName} ${currentUser.lastName}`}
            className="relative w-24 h-24 rounded-full mx-auto object-cover border-2 border-white"
          />
        </div>
        <h3 className="text-xl font-medium text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
          {currentUser.firstName} {currentUser.lastName}
        </h3>
      </div>
      <button
        onClick={onLogout}
        className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center"
      >
        <LogOut className="mr-2" /> Logout
      </button>
    </div>
  )
}
