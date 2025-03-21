import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Phone } from 'lucide-react';

const VoiceCallModal = ({ call, duration, isMuted, onToggleMute, onEndCall, remoteStream }) => {
  // Get call recipient/initiator info
  const audioRef = useRef(null);

  const otherUserName = call.recipientName || call.initiatorName || "User";
  const otherUserImage = call.recipientImage || call.initiatorImage || null;

  // Set up audio elements for streams
  useEffect(() => {
    console.log('VoiceCallModal: Trying to attach remote stream:', remoteStream);
    
    if (remoteStream && audioRef.current) {
      console.log('VoiceCallModal: Attaching remote stream to audio element');
      
      // Clean up previous stream if exists
      if (audioRef.current.srcObject) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
      
      audioRef.current.srcObject = remoteStream;
      
      // Use try-catch around play() and don't log to console directly
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playback started successfully');
          })
          .catch(err => {
            console.error('Error playing audio:', err);
            // Handle the error gracefully - maybe try again after a short delay
            setTimeout(() => {
              audioRef.current?.play().catch(e => 
                console.error('Retry error:', e)
              );
            }, 300);
          });
      }
    }
    
    // Cleanup function to properly handle component unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    };
  }, [remoteStream]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col items-center justify-center z-50">
      {/* Use the ref instead of id */}
      <audio ref={audioRef} autoPlay={false} playsInline style={{ display: 'none' }}></audio>
      
      <div className="text-center mb-12">
        <div className="w-32 h-32 mx-auto bg-white/10 backdrop-blur rounded-full flex items-center justify-center mb-6 relative">
          {otherUserImage ? (
            <img 
              src={otherUserImage} 
              alt={otherUserName}
              className="w-28 h-28 rounded-full object-cover" 
            />
          ) : (
            <span className="text-5xl text-white font-bold">
              {otherUserName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-emerald-500 rounded-full text-white text-xs font-medium">
            On Call
          </div>
        </div>
        <h3 className="text-white text-2xl font-bold">{otherUserName}</h3>
        <p className="text-white/70 text-lg mt-1">{duration}</p>
      </div>
      
      <div className="flex justify-center space-x-6">
        <button
          onClick={onToggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
            isMuted 
              ? 'bg-gray-400 text-white' 
              : 'bg-white/10 backdrop-blur text-white'
          }`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <button
          onClick={onEndCall}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
        >
          <Phone size={24} className="transform rotate-135" />
        </button>
      </div>
    </div>
  );
};

export default VoiceCallModal;