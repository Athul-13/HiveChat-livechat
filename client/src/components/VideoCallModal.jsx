import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, Video, VideoOff } from 'lucide-react';

const VideoCallModal = ({ 
  call, 
  duration, 
  isMuted, 
  isVideoOff, 
  onToggleMute, 
  onToggleVideo, 
  onEndCall, 
  remoteStream, 
  localStream 
}) => {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  
  // Set up video elements for streams
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [remoteStream, localStream]);
  
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Main video (remote) */}
      <div className="flex-1 bg-gray-900 relative">
        {remoteStream ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto bg-white/10 backdrop-blur rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl text-white font-bold">
                  {(call.recipientName || call.initiatorName || "User").charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-white text-lg">Connecting video...</p>
            </div>
          </div>
        )}
        
        {/* Call duration */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white">
          {duration}
        </div>
      </div>
      
      {/* Local video (PiP) */}
      <div className="absolute bottom-24 right-4 w-32 h-48 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg">
        {localStream && !isVideoOff ? (
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {(currentUser?.firstName || "Me").charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="bg-black p-6 flex justify-center space-x-6">
        <button
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isMuted 
              ? 'bg-red-500 text-white' 
              : 'bg-white/10 text-white'
          }`}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        
        <button
          onClick={onEndCall}
          className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
        >
          <Phone size={22} className="transform rotate-135" />
        </button>
        
        <button
          onClick={onToggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isVideoOff 
              ? 'bg-red-500 text-white' 
              : 'bg-white/10 text-white'
          }`}
        >
          {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>
      </div>
    </div>
  );
};

export default VideoCallModal;