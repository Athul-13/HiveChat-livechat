import { useState } from "react"
import { User, Edit2 } from "lucide-react"
import Profile from "../assets/proffile.jpg";

export default function ProfileArea({ currentUser, onUpdate }) {
  const [firstName, setFirstName] = useState(currentUser.firstName)
  const [lastName, setLastName] = useState(currentUser.lastName)
  const [about, setAbout] = useState(currentUser.about)
  const [isEditing, setIsEditing] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    onUpdate({ firstName, lastName, about })
    setIsEditing(false)
  }

  return (
    <div className="h-full bg-white rounded-lg p-6 overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-6 flex items-center text-indigo-600">
        <User className="mr-2 text-purple-500" /> Profile
      </h2>
      <div className="mb-6 text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full blur-sm opacity-50"></div>
          <img
            src={currentUser.profilePicture || Profile}
            alt={`${currentUser.firstName} ${currentUser.lastName}`}
            className="relative w-32 h-32 rounded-full mx-auto object-cover border-2 border-white"
          />
        </div>
        <button className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 font-medium hover:opacity-80 transition-opacity">
          Change Avatar
        </button>
      </div>
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="about" className="block text-sm font-medium text-gray-700 mb-1">
              About
            </label>
            <textarea
              id="about"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-md hover:shadow-lg transition-all duration-300"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
            <h3 className="text-lg font-medium text-indigo-600 mb-2">
              {currentUser.firstName} {currentUser.lastName}
            </h3>
            <p className="text-gray-700">{currentUser.about || "No bio added yet."}</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-md hover:shadow-lg transition-all duration-300 flex items-center"
          >
            <Edit2 className="mr-2" size={16} /> Edit Profile
          </button>
        </div>
      )}
    </div>
  )
}