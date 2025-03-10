import { useState } from "react";
import { X, Check, Users } from "lucide-react";
import Profile from '../assets/proffile.jpg';
import { userService } from "../utils/api";

export default function CreateGroupModal({ contacts, onClose, onChatSelect }) {
  const [groupName, setGroupName] = useState("");
  const [selectedContacts, setSelectedContacts] = useState([]);

  const handleContactToggle = (contactId) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const handleSubmit = async(e) => {
  e.preventDefault();
  if (groupName.trim() && selectedContacts.length > 0) {
    const data = await userService.createGroup(groupName, selectedContacts);
    // Close the modal
    onClose();
    // Select the newly created group chat if data contains the created group
    if (data && data._id) {
      onChatSelect(data);
    }
  }
    
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center">
              <Users size={20} className="mr-2" />
              Create New Group
            </h2>
            <button 
              onClick={onClose} 
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-indigo-100 text-sm mt-1">Connect with multiple friends at once</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-5">
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          <div className="mb-5">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Select Members ({selectedContacts.length} selected)</h3>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 scrollbar-thin">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`flex items-center justify-between p-3 hover:bg-indigo-50 cursor-pointer transition-colors duration-200 ${
                    selectedContacts.includes(contact.id) ? "bg-indigo-50" : ""
                  }`}
                  onClick={() => handleContactToggle(contact.id)}
                >
                  <div className="flex items-center">
                    <div className="relative">
                      <img
                        src={contact.profilePicture || Profile}
                        alt={`${contact.firstName} ${contact.lastName}`}
                        className="h-10 w-10 rounded-full object-cover mr-3 border-2 border-white shadow-sm"
                      />
                      {contact.status === "online" && (
                        <span className="absolute bottom-0 right-3 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">{`${contact.firstName} ${contact.lastName}`}</span>
                      {contact.status && (
                        <p className="text-xs text-gray-500 capitalize">{contact.status}</p>
                      )}
                    </div>
                  </div>
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors duration-200 ${
                    selectedContacts.includes(contact.id) 
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white" 
                      : "border-2 border-gray-300"
                  }`}>
                    {selectedContacts.includes(contact.id) && <Check size={16} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupName.trim() || selectedContacts.length === 0}
              className={`px-5 py-2.5 rounded-lg shadow-md transition-all duration-300 ${
                !groupName.trim() || selectedContacts.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:scale-105"
              }`}
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}