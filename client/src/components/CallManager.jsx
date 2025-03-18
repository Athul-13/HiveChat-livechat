import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import socket from '../utils/socket';
import IncomingCallModal from './IncomingCallModal';
import VoiceCallModal from './VoiceCallModal'; // Fixed import
import VideoCallModal from './VideoCallModal';
import { EVENTS } from '../utils/socketConfig';
import { userService } from '../utils/api';

const CallManager = forwardRef(({ currentUser }, ref) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callTimer, setCallTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    initiateCall: (recipientId, chatId, callType) => {
      initiateCall(recipientId, chatId, callType);
    }
  }));
  
  // WebRTC configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Handle WebRTC offer - use useCallback to memoize the function
  const handleOffer = useCallback(async (data) => {
    if (data.to === currentUser.id && !peerConnection) {
      try {
        const pc = await setupPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit(EVENTS.ANSWER, {
          callId: data.callId,
          from: currentUser.id,
          to: data.from,
          sdp: pc.localDescription
        });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    }
  }, [currentUser.id, peerConnection]);

  // Handle WebRTC answer - use useCallback
  const handleAnswer = useCallback(async (data) => {
    if (data.to === currentUser.id && peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }, [currentUser.id, peerConnection]);

  // Handle ICE candidates - use useCallback
  const handleIceCandidate = useCallback(async (data) => {
    if (data.to === currentUser.id && peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }, [currentUser.id, peerConnection]);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start timer for call duration
  const startCallTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    setCallTimer(0);
    const interval = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  }, [timerInterval]);

  // Setup WebRTC peer connection
  const setupPeerConnection = useCallback(async () => {
    // Close any existing connections
    if (peerConnection) {
      peerConnection.close();
    }
    
    // Create new peer connection
    const pc = new RTCPeerConnection(iceServers);
    setPeerConnection(pc);
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && activeCall) {
        socket.emit(EVENTS.ICE_CANDIDATE, {
          callId: activeCall.callId,
          from: currentUser.id,
          to: activeCall.recipientId || activeCall.initiatorId,
          candidate: event.candidate
        });
      }
    };
    
    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
    
    // Get local media
    const constraints = {
      audio: true,
      video: activeCall?.callType === 'video'
    };
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
    
    return pc;
  }, [activeCall, currentUser.id, iceServers, peerConnection]);

  // End an active call
  const endCall = useCallback(() => {
    // Clear timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    // Notify server that call has ended
    if (activeCall) {
      socket.emit(EVENTS.END_CALL, { callId: activeCall.callId });
      socket.emit(EVENTS.LEAVE_ROOM, activeCall.chatId);
    }
    
    // Stop and cleanup media streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }
    
    // Reset state
    setActiveCall(null);
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
    setCallTimer(0);
    setIsMuted(false);
    setIsVideoOff(false);
  }, [activeCall, localStream, peerConnection, timerInterval]);

  // Separate useEffect for socket event listeners
  // This will only run once when the component mounts
  useEffect(() => {
    // Listen for incoming calls
    const handleIncomingCall = (callData) => {
      console.log('Incoming call:', callData);
      setIncomingCall(callData);
    };

    // Listen for call accepted events
    const handleCallAccepted = (data) => {
      console.log('Call accepted:', data);
      if (activeCall && activeCall.callId === data.callId) {
        // Start timer when call is accepted
        startCallTimer();
      }
    };

    // Listen for call ended events
    const handleCallEnded = (data) => {
      console.log('Call ended:', data);
      if (activeCall && activeCall.callId === data.callId) {
        endCall();
      }
    };

    socket.on('incomingCall', handleIncomingCall);
    socket.on(EVENTS.ACCEPT_CALL, handleCallAccepted);
    socket.on(EVENTS.END_CALL, handleCallEnded);
    socket.on(EVENTS.OFFER, handleOffer);
    socket.on(EVENTS.ANSWER, handleAnswer);
    socket.on(EVENTS.ICE_CANDIDATE, handleIceCandidate);

    return () => {
      socket.off('incomingCall', handleIncomingCall);
      socket.off(EVENTS.ACCEPT_CALL, handleCallAccepted);
      socket.off(EVENTS.END_CALL, handleCallEnded);
      socket.off(EVENTS.OFFER, handleOffer);
      socket.off(EVENTS.ANSWER, handleAnswer);
      socket.off(EVENTS.ICE_CANDIDATE, handleIceCandidate);
      
      // Cleanup any active call
      if (activeCall) {
        endCall();
      }
    };
  }, [
    handleOffer, handleAnswer, handleIceCandidate, 
    activeCall, endCall
  ]); // Empty dependency array

  // This useEffect will handle updates to the activeCall state
  useEffect(() => {
    // Update socket handlers that depend on activeCall here
    // This way, we don't need to reinstall all socket listeners
    
    // Update any other state that depends on activeCall
    
  }, [activeCall]);

  // Accept incoming call
  const acceptCall = async () => {
    try {
      if (!incomingCall) return;
      
      // Create active call from incoming call data
      const call = {
        callId: incomingCall.callId,
        chatId: incomingCall.chatId,
        initiatorId: incomingCall.initiatorId,
        callType: incomingCall.callType,
        isInitiator: false
      };
      
      setIncomingCall(null);
      setActiveCall(call);
      
      // Setup WebRTC connection
      await setupPeerConnection();
      
      // Join the call room
      socket.emit(EVENTS.JOIN_ROOM, call.chatId);
      
      // Notify server that call is accepted
      socket.emit(EVENTS.ACCEPT_CALL, {
        callId: call.callId,
        userId: currentUser.id
      });
      
      // Start timer
      startCallTimer();
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    if (!incomingCall) return;
    
    // Notify the caller that the call was rejected
    socket.emit('rejectCall', {
      callId: incomingCall.callId,
      userId: currentUser.id
    });
    
    setIncomingCall(null);
  };

  // Initiate a new call
  const initiateCall = async (recipientId, chatId, callType) => {
    try {
      // Request to initiate call through API
      const data = await userService.initiateCall(currentUser.id, recipientId, chatId, callType);

        const call = {
            callId: data.callId,
            chatId,
            recipientId,
            callType,
            isInitiator: true,
        };
        
        setActiveCall(call);
        
        // Setup WebRTC connection
        const pc = await setupPeerConnection();
        
        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket.emit(EVENTS.OFFER, {
          callId: call.callId,
          from: currentUser.id,
          to: recipientId,
          sdp: pc.localDescription
        });
        
        // Join the call room
        socket.emit(EVENTS.JOIN_ROOM, chatId);

    } catch (error) {
      console.error('Error initiating call:', error);
    }
  };

  // Toggle audio mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream && activeCall?.callType === 'video') {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <>
      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
      
      {/* Voice Call Modal */}
      {activeCall && activeCall.callType === 'voice' && (
        <VoiceCallModal
          call={activeCall}
          duration={formatTime(callTimer)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onEndCall={endCall}
          remoteStream={remoteStream}
          localStream={localStream}
        />
      )}
      
      {/* Video Call Modal */}
      {activeCall && activeCall.callType === 'video' && (
        <VideoCallModal
          call={activeCall}
          duration={formatTime(callTimer)}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
          remoteStream={remoteStream}
          localStream={localStream}
        />
      )}
    </>
  );
});

export default CallManager;
CallManager.displayName = 'CallManager';