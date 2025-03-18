import React from 'react';
import { Phone, X } from 'lucide-react';

const IncomingCallModal = ({ call, onAccept, onReject }) => {
  // Get caller info
  const callerName = call.callerName || "Someone";
  const callType = call.callType || "voice";
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 animate-fadeIn">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            {call.callerProfilePicture ? (
              <img 
                src={call.callerProfilePicture} 
                alt={callerName}
                className="w-16 h-16 rounded-full object-cover" 
              />
            ) : (
              <Phone size={32} className="text-white" />
            )}
          </div>
          <h3 className="text-xl font-bold">{callerName}</h3>
          <p className="text-gray-500">{callType === 'video' ? 'Video Call' : 'Voice Call'}</p>
        </div>
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={onReject}
            className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
          >
            <X size={24} />
          </button>
          <button
            onClick={onAccept}
            className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
          >
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;