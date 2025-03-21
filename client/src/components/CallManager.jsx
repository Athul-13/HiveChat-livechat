import React, { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import socket from '../utils/socket';
import IncomingCallModal from './IncomingCallModal';
import VoiceCallModal from './VoiceCallModal';
import VideoCallModal from './VideoCallModal';
import { userService } from '../utils/api';

const CallManager = forwardRef(({ currentUser }, ref) => {
  const [callState, setCallState] = useState(null); // null, 'incoming', 'initiating', 'ongoing'
  const [callData, setCallData] = useState(null); // Store call metadata
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState('00:00');

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);

  // Expose methods to parent component (Homepage)
  useImperativeHandle(ref, () => ({
    initiateCall: (recipientId, chatId, callType) => {
      initiateCall(recipientId, chatId, callType);
    }
  }));

  // WebRTC configuration
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Add TURN servers if needed
    ]
  };

  // Initialize peer connection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate && callData) {
        socket.emit('iceCandidate', {
          from: currentUser.id,
          to: callData.recipientId || callData.initiatorId,
          chatId: callData.chatId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
    };

    return pc;
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Start call duration timer
  const startTimer = () => {
    let seconds = 0;
    timerRef.current = setInterval(() => {
      seconds++;
      setDuration(formatDuration(seconds));
    }, 1000);
  };

  // Stop timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Start a call
  const initiateCall = async (recipientId, chatId, callType) => {
    try {
      setCallState('initiating');
      const callInfo = {
        chatId,
        recipientId,
        callType,
        initiatorId: currentUser.id,
        initiatorName: `${currentUser.firstName} ${currentUser.lastName}`,
        initiatorImage: currentUser.profilePicture
      };
      setCallData(callInfo);

      // Get local media
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });

      // Create peer connection
      peerConnectionRef.current = createPeerConnection();
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });

      // Create offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      // Create call record via userService
      const callResponse = await userService.initiateCall({
        chatId,
        recipientId,
        callType
      });

      // Update call data with callId
      setCallData(prev => ({ ...prev, callId: callResponse._id }));

      // Send offer via socket
      socket.emit('offer', {
        from: currentUser.id,
        to: recipientId,
        chatId,
        callId: callResponse._id,
        callType,
        sdp: peerConnectionRef.current.localDescription
      });

    } catch (error) {
      console.error('Failed to initiate call:', error);
      endCall();
    }
  };

  // Handle incoming offer
  const handleOffer = async (data) => {
    if (data.to !== currentUser.id) return;

    setCallState('incoming');
    setCallData({
      callId: data.callId,
      chatId: data.chatId,
      initiatorId: data.from,
      callerName: data.callerName || 'Someone', // You might need to pass this from the server
      callerProfilePicture: data.callerProfilePicture, // Pass this if available
      callType: data.callType
    });
  };

  // Accept call
  const acceptCall = async () => {
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.callType === 'video'
      });

      peerConnectionRef.current = createPeerConnection();
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(callData.sdp));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socket.emit('answer', {
        from: currentUser.id,
        to: callData.initiatorId,
        chatId: callData.chatId,
        callId: callData.callId,
        sdp: peerConnectionRef.current.localDescription
      });

      setCallState('ongoing');
      socket.emit('acceptCall', {
        from: currentUser.id,
        to: callData.initiatorId,
        chatId: callData.chatId,
        callId: callData.callId
      });
      startTimer();

    } catch (error) {
      console.error('Error accepting call:', error);
      endCall();
    }
  };

  // Handle incoming answer
  const handleAnswer = async (data) => {
    if (data.to !== currentUser.id) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      setCallState('ongoing');
      startTimer();
    } catch (error) {
      console.error('Error handling answer:', error);
      endCall();
    }
  };

  // Handle ICE candidates
  const handleIceCandidate = async (data) => {
    if (data.to !== currentUser.id || !peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  // Handle call acceptance
  const handleAcceptCall = (data) => {
    if (data.to === currentUser.id) {
      setCallState('ongoing');
      startTimer();
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => (track.enabled = !track.enabled));
      setIsMuted(prev => !prev);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current && callData.callType === 'video') {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => (track.enabled = !track.enabled));
      setIsVideoOff(prev => !prev);
    }
  };

  // End call
  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }

    if (callData?.chatId && (callData.recipientId || callData.initiatorId)) {
      socket.emit('endCall', { callId: callData.callId });
    }

    stopTimer();
    setCallState(null);
    setCallData(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setDuration('00:00');
  };

  // Socket listeners
  useEffect(() => {
    socket.on('offer', (data) => {
      data.sdp = data.sdp; // Ensure SDP is stored
      handleOffer(data);
    });
    socket.on('answer', handleAnswer);
    socket.on('iceCandidate', handleIceCandidate);
    socket.on('acceptCall', handleAcceptCall);
    socket.on('endCall', endCall);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('iceCandidate', handleIceCandidate);
      socket.off('acceptCall', handleAcceptCall);
      socket.off('endCall', endCall);
    };
  }, []);

  // Render appropriate modal based on call state
  if (!callState || !callData) return null;

  if (callState === 'incoming') {
    return (
      <IncomingCallModal
        call={{
          callerName: callData.callerName || callData.initiatorName,
          callerProfilePicture: callData.callerProfilePicture || callData.initiatorImage,
          callType: callData.callType
        }}
        onAccept={acceptCall}
        onReject={endCall}
      />
    );
  }

  if (callState === 'ongoing' || callState === 'initiating') {
    if (callData.callType === 'voice') {
      return (
        <VoiceCallModal
          call={{
            recipientName: callData.recipientId === currentUser.id ? callData.initiatorName : callData.recipientName,
            initiatorName: callData.initiatorName,
            recipientImage: callData.recipientId === currentUser.id ? callData.initiatorImage : callData.recipientImage,
            initiatorImage: callData.initiatorImage
          }}
          duration={duration}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onEndCall={endCall}
          remoteStream={remoteStreamRef.current}
        />
      );
    } else if (callData.callType === 'video') {
      return (
        <VideoCallModal
          call={{
            recipientName: callData.recipientId === currentUser.id ? callData.initiatorName : callData.recipientName,
            initiatorName: callData.initiatorName,
            recipientImage: callData.recipientId === currentUser.id ? callData.initiatorImage : callData.recipientImage,
            initiatorImage: callData.initiatorImage
          }}
          duration={duration}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
          remoteStream={remoteStreamRef.current}
          localStream={localStreamRef.current}
          currentUser={currentUser}
        />
      );
    }
  }

  return null;
});

export default CallManager;

// import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
// import socket from '../utils/socket';
// import IncomingCallModal from './IncomingCallModal';
// import VoiceCallModal from './VoiceCallModal';
// import VideoCallModal from './VideoCallModal';
// import { EVENTS } from '../utils/socketConfig';
// import { userService } from '../utils/api';

// const CallManager = forwardRef(({ currentUser }, ref) => {
//   const [incomingCall, setIncomingCall] = useState(null);
//   const [activeCall, setActiveCall] = useState(null);
//   const [callTimer, setCallTimer] = useState(0);
//   const [timerInterval, setTimerInterval] = useState(null);
//   const [localStream, setLocalStream] = useState(null);
//   const [remoteStream, setRemoteStream] = useState(null);
//   const [peerConnection, setPeerConnection] = useState(null);
//   const [isMuted, setIsMuted] = useState(false);
//   const [isVideoOff, setIsVideoOff] = useState(false);

//   useImperativeHandle(ref, () => ({
//     initiateCall: (recipientId, chatId, callType) => {
//       initiateCall(recipientId, chatId, callType);
//     },
//   }));

//   const iceServers = {
//     iceServers: [
//       { urls: "stun:stun.l.google.com:19302" },
//       { urls: "stun:stun1.google.com:19302" },
//       { urls: "stun:ss-turn2.xirsys.com" }, // Xirsys STUN server
//       {
//         urls: [
//           "turn:ss-turn2.xirsys.com:80?transport=udp",
//           "turn:ss-turn2.xirsys.com:3478?transport=udp",
//           "turn:ss-turn2.xirsys.com:80?transport=tcp",
//           "turn:ss-turn2.xirsys.com:3478?transport=tcp",
//           "turns:ss-turn2.xirsys.com:443?transport=tcp",
//           "turns:ss-turn2.xirsys.com:5349?transport=tcp"
//       ],
//         username: "fJuhMaoIeB0Q_xDmGeGX9gryuKBeSAP4U0rCaC17fX5BjMqhOLLbEK1t99ckWhHEAAAAAGfcIuZzdHJ1bWZyZWk=",
//         credential: "b6f7c7ac-0595-11f0-9657-0242ac140004",
//       }
//     ]
//   };

//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };

//   const startCallTimer = useCallback(() => {
//     if (timerInterval) {
//       clearInterval(timerInterval);
//     }
//     setCallTimer(0);
//     const interval = setInterval(() => {
//       setCallTimer((prev) => prev + 1);
//     }, 1000);
//     setTimerInterval(interval);
//   }, [timerInterval]);

//   const setupPeerConnection = useCallback(
//     async (callType) => {
//       try {
//         // Clean up existing connection
//         if (peerConnection) {
//           console.log("Closing existing peer connection...");
//           peerConnection.getSenders().forEach(sender => {
//             peerConnection.removeTrack(sender);
//           });
//           peerConnection.close();
//           setPeerConnection(null);
//         }
  
//         // Request media devices first
//         const constraints = {
//           audio: {
//             echoCancellation: true,
//             noiseSuppression: true,
//             autoGainControl: true
//           },
//           video: callType === 'video' ? {
//             width: { ideal: 640 },
//             height: { ideal: 480 },
//             frameRate: { ideal: 30 }
//           } : false
//         };
  
//         console.log('Requesting media devices...');
//         const stream = await navigator.mediaDevices.getUserMedia(constraints);
//         console.log('Media stream obtained:', stream.getTracks().map(t => t.kind));

//         const audioTracks = stream.getAudioTracks();
//         if (audioTracks.length === 0) {
//           console.error('No audio tracks in local stream!');
//         }
        
//         // Create new connection
//         console.log('Creating new RTCPeerConnection');
//         const pc = new RTCPeerConnection(iceServers);
        
//         console.log('PC initial states - signaling:', pc.signalingState, 
//           'ice:', pc.iceConnectionState, 
//           'connection:', pc.connectionState);
        
//         // Add tracks to peer connection
//         console.log(`Adding ${stream.getTracks().length} tracks to peer connection`);
//         stream.getTracks().forEach(track => {
//           const existingSender = pc.getSenders().find(sender => sender.track === track);
//           if (existingSender) {
//             console.warn(`⚠️ Track ${track.kind} already exists in peer connection!`);
//           } else {
//             console.log(`✅ Adding ${track.kind} track to peer connection (enabled: ${track.enabled})`);
//             pc.addTrack(track, stream);
//           }
//         });

//         // Set up event handlers
//         pc.ontrack = (event) => {
//           console.log('ontrack event fired');
//           console.log('Received track:', event.track);
//           console.log('Streams:', event.streams);
//           if (event.streams && event.streams[0]) {
//             setRemoteStream(event.streams[0]);
//             console.log('Remote stream set with tracks:', event.streams[0].getTracks());
//           } else {
//             console.error('No streams in ontrack event');
//           }
//         };
  
//         pc.oniceconnectionstatechange = () => {
//           console.log('ICE Connection State changed to:', pc.iceConnectionState);
//           if (pc.iceConnectionState === 'checking') {
//             console.log('ICE negotiation in progress...');
//           } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
//             console.log('ICE connected - media should start flowing');
//           } else if (pc.iceConnectionState === 'disconnected') {
//             console.log('ICE disconnected - may recover automatically');
//           } else if (pc.iceConnectionState === 'failed') {
//             console.error('ICE connection failed - attempting restart');
//             // Try to restart ICE
//             if (pc.signalingState !== 'closed') {
//               pc.restartIce();
//             }
//           }
//         };
  
//         // Update states only after successful setup
//         setLocalStream(stream);
//         setPeerConnection(pc);

//         pc.onconnectionstatechange = () => {
//           console.log('Connection state changed:', pc.connectionState);
//           if (pc.connectionState === 'connected') {
//             console.log('Peer connection established successfully');
//             console.log('Tracks in local stream:', stream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', '));
//             console.log('Tracks in remote stream:', remoteStream ? remoteStream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', ') : 'No remote stream yet');
//           } else if (pc.connectionState === 'failed') {
//             console.error('Connection failed');
//             endCall();
//           }
//         };
  
//         pc.onsignalingstatechange = () => {
//           console.log('Signaling state changed:', pc.signalingState);
//         };
//         return pc;
//       } catch (error) {
//         console.error('Error in setupPeerConnection:', error);
//         throw error;
//       }
//     },
//     [iceServers]
//   );

//   const endCall = useCallback(() => {
//     if (!activeCall && !incomingCall) return;
//     console.log('Ending call. Active call:', activeCall?.callId);

//     if (timerInterval) {
//       clearInterval(timerInterval);
//       setTimerInterval(null);
//     }
    
//     // First, send end call signal if we have an active call
//     if (activeCall) {
//       socket.emit(EVENTS.END_CALL, { callId: activeCall.callId });
//       socket.emit(EVENTS.LEAVE_ROOM, activeCall.chatId);
//     }
    
//     // Clean up media streams
//     if (localStream) {
//       localStream.getTracks().forEach((track) => {
//         console.log('Stopping track:', track.kind);
//         track.stop();
//       });
//     }
    
//     // Close peer connection
//     if (peerConnection) {
//       console.log('Closing peer connection');
//       peerConnection.close();
//     }
    
//     // Reset all states
//     setActiveCall(null);
//     setIncomingCall(null); // Also clear any incoming call data
//     setLocalStream(null);
//     setRemoteStream(null);
//     setPeerConnection(null);
//     setCallTimer(0);
//     setIsMuted(false);
//     setIsVideoOff(false);
//   }, [activeCall, incomingCall, localStream, peerConnection, timerInterval]);

//   const handleOffer = useCallback(
//   async (data) => {
//     console.log('Received offer:', data);
//     if (data.to === currentUser.id) {
//       try {
//         // Don't set up new connection if we're already in a call
//         if (activeCall) {
//           console.log('Already in a call, rejecting offer');
//           socket.emit('rejectCall', {
//             callId: data.callId,
//             userId: currentUser.id,
//           });
//           return;
//         }

//         // Set the incoming call data - DO NOT set activeCall yet
//         setIncomingCall({
//           callId: data.callId,
//           chatId: data.chatId,
//           initiatorId: data.from,
//           callType: data.callType,
//           sdp: data.sdp  // IMPORTANT: Store the offer SDP
//         });
//       } catch (error) {
//         console.error('Error handling offer:', error);
//         endCall();
//       }
//     }
//   },
//   [currentUser.id, activeCall, endCall]
// );

// const handleAnswer = useCallback(async (data) => {
//   if (data.to === currentUser.id ) {
//     try {
//       console.log('Received answer SDP:', data.sdp);
//       const remoteDesc = new RTCSessionDescription(data.sdp);
//       console.log('Setting remote description with type:', remoteDesc.type);
//       await peerConnection.setRemoteDescription(remoteDesc);
//       console.log('Remote description set successfully');
      
//       // Add this debug log
//       console.log('After setting remote description - connection state:', 
//                   peerConnection.connectionState,
//                   'ice state:', peerConnection.iceConnectionState);
      
//       startCallTimer();
//     } catch (error) {
//       console.error('Error setting remote description:', error);
//     }
//   } else {
//     console.log('Answer ignored - no peer connection or wrong user');
//   }
// }, [currentUser.id, peerConnection, startCallTimer]);

//   const handleIceCandidate = useCallback(async (data) => {
//     if (data.to === currentUser.id && peerConnection) {
//       try {
//         console.log('Received ICE candidate:', data.candidate);
//         await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
//         console.log('ICE candidate added successfully');
//       } catch (error) {
//         console.error('Error adding ICE candidate:', error);
//       }
//     }
//   }, [currentUser.id, peerConnection]);

//   const initiateCall = async (recipientId, chatId, callType) => {
//     let pc = null;
//     try {
//       console.log('Initiating call with:', { recipientId, chatId, callType });
//       const data = await userService.initiateCall(currentUser.id, recipientId, chatId, callType);
//       console.log('API call succeeded:', data);
  
//       const call = {
//         callId: data.callId,
//         chatId,
//         recipientId,
//         callType,
//         isInitiator: true,
//       };
//       setActiveCall(call);
  
//       // Setup peer connection
//       pc = await setupPeerConnection(callType);
      
//       // Join the room first
//       console.log('Joining room:', chatId);
//       socket.emit(EVENTS.JOIN_ROOM, chatId);
  
//       // Create offer with explicit constraints
//       const offerOptions = {
//         offerToReceiveAudio: true,
//         offerToReceiveVideo: callType === 'video',
//         iceRestart: true 
//       };
      
//       console.log('Creating offer with options:', offerOptions);
//       const offer = await pc.createOffer(offerOptions);
//       console.log('Offer created:', offer);
  
//       console.log('Setting local description...');
//       await pc.setLocalDescription(offer);
//       console.log('Local description set. Signaling state:', pc.signalingState);
  
//       // Send the offer immediately
//       const offerData = {
//         callId: call.callId,
//         from: currentUser.id,
//         to: recipientId,
//         sdp: pc.localDescription,
//         callType,
//         chatId
//       };
      
//       socket.emit(EVENTS.OFFER, offerData);
//       console.log('Offer sent');
  
//       // Set up ICE candidate handling
//       pc.onicecandidate = (event) => {
//         if (event.candidate) {
//           console.log('New ICE candidate:', event.candidate.candidate);
//           socket.emit(EVENTS.ICE_CANDIDATE, {
//             callId: call.callId,
//             from: currentUser.id,
//             to: recipientId,
//             candidate: event.candidate,
//           });
//         }
//       };

//       // Set up connection state monitoring with timeout
//       const connectionPromise = new Promise((resolve, reject) => {
//         const timeout = setTimeout(() => {
//           console.log('Connection establishment timed out - continuing anyway');
//           resolve();
//         }, 10000); // 5 second timeout
        
//         const existingHandler = pc.onconnectionstatechange;
//         pc.onconnectionstatechange = () => {
//           console.log('Connection state changed:', pc.connectionState);
//           if (pc.connectionState === 'connected') {
//             clearTimeout(timeout);
//             resolve();
//           } else if (pc.connectionState === 'failed') {
//             clearTimeout(timeout);
//             reject(new Error('Connection failed'));
//           }
//           // Call the existing handler if there was one
//           if (existingHandler) existingHandler.call(pc);
//         };
//       });

//       try {
//         await connectionPromise;
//         console.log('Connection established or timed out - continuing');
//       } catch (error) {
//         console.error('Connection error:', error);
//         // Don't call endCall here, just continue
//       }
  
//       // Monitor connection state
//       pc.oniceconnectionstatechange = () => {
//         console.log('ICE Connection State:', pc.iceConnectionState);
//         if (pc.iceConnectionState === 'failed') {
//           console.error('ICE connection failed - investigating...');
//           // Optionally delay endCall to allow recovery
//           setTimeout(() => {
//             if (pc.iceConnectionState === 'failed') {
//               endCall();
//             }
//           }, 2000); // Give it 2 seconds to recover
//         }
//       };
      
//       pc.onconnectionstatechange = () => {
//         console.log('Connection state changed:', pc.connectionState);
//         console.log('Current state details:', {
//           signalingState: pc.signalingState,
//           iceConnectionState: pc.iceConnectionState,
//           iceGatheringState: pc.iceGatheringState,
//           connectionState: pc.connectionState
//         });
//         if (pc.connectionState === 'connected') {
//           console.log('Peer connection established successfully');
//           console.log('Checking remote tracks availability...');
//           const senders = pc.getSenders();
//           const receivers = pc.getReceivers();
//           console.log('Senders:', senders.length, 'Receivers:', receivers.length);
//         } else if (pc.connectionState === 'failed') {
//           console.error('Connection failed');
//           setTimeout(() => {
//             if (pc.connectionState === 'failed') {
//               endCall();
//             }
//           }, 2000);
//         }
//       };
  
//     } catch (error) {
//       console.error('Error in initiateCall:', error);
//       if (pc) {
//         console.log('Cleaning up failed connection...');
//         if (pc.signalingState !== 'closed') {
//           pc.close();
//         }
//       }
//       endCall();
//     }
//   };

//   useEffect(() => {
//     const handleIncomingCall = (callData) => {
//       console.log('Incoming call:', callData);
      
//       // If already in a call, reject new incoming calls
//       if (activeCall) {
//         console.log('Already in a call, rejecting incoming call');
//         socket.emit('rejectCall', {
//           callId: callData.callId,
//           userId: currentUser.id,
//         });
//         return;
//       }
      
//       setIncomingCall(callData);
//     };
  
//     const handleCallAccepted = (data) => {
//       console.log('Call accepted:', data);
//       if (activeCall && activeCall.callId === data.callId) {
//         startCallTimer();
//       }
//     };
  
//     const handleCallEnded = (data) => {
//       console.log('Call ended:', data);
//       // Make sure we clean up everything if our call was ended remotely
//       endCall();
//     };
  
//     socket.on('incomingCall', handleIncomingCall);
//     socket.on(EVENTS.ACCEPT_CALL, handleCallAccepted);
//     socket.on(EVENTS.END_CALL, handleCallEnded);
//     socket.on(EVENTS.OFFER, handleOffer);
//     socket.on(EVENTS.ANSWER, (data) => {
//       console.log('ANSWER event received:', data);
//       handleAnswer(data);
//     });
//     socket.on(EVENTS.ICE_CANDIDATE, handleIceCandidate);
  
//     return () => {
//       socket.off('incomingCall', handleIncomingCall);
//       socket.off(EVENTS.ACCEPT_CALL, handleCallAccepted);
//       socket.off(EVENTS.END_CALL, handleCallEnded);
//       socket.off(EVENTS.OFFER, handleOffer);
//       socket.off(EVENTS.ANSWER, handleAnswer);
//       socket.off(EVENTS.ICE_CANDIDATE, handleIceCandidate);
//     };
//   }, [currentUser.id, handleOffer, handleAnswer, handleIceCandidate, activeCall, endCall, startCallTimer]);

//   const acceptCall = async () => {
//     try {
//       if (!incomingCall) return;
  
//       const call = {
//         callId: incomingCall.callId,
//         chatId: incomingCall.chatId,
//         initiatorId: incomingCall.initiatorId,
//         callType: incomingCall.callType,
//         isInitiator: false,
//       };
  
//       // First set up the peer connection
//       const pc = await setupPeerConnection(call.callType);
      
//       // Join the room
//       console.log('Joining room:', call.chatId);
//       socket.emit(EVENTS.JOIN_ROOM, call.chatId);
  
//       // IMPORTANT: Set remote description (offer) before creating answer
//       // The offer should be available in incomingCall.sdp
//       if (!incomingCall.sdp) {
//         console.error('Missing offer SDP in incoming call data');
//         endCall();
//         return;
//       }
      
//       console.log('Setting remote description (offer)...');
//       await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
//       console.log('Remote description set successfully');
  
//       // Notify caller that call was accepted
//       socket.emit(EVENTS.ACCEPT_CALL, {
//         callId: call.callId,
//         from: currentUser.id,
//         to: call.initiatorId,
//         chatId: call.chatId,
//       });
  
//       // Set up ICE candidate handling
//       pc.onicecandidate = (event) => {
//         if (event.candidate) {
//           socket.emit(EVENTS.ICE_CANDIDATE, {
//             callId: call.callId,
//             from: currentUser.id,
//             to: call.initiatorId,
//             candidate: event.candidate,
//           });
//         }
//       };
      
//       // Create and send answer (now valid since remote description is set)
//       console.log('Creating answer...');
//       const answer = await pc.createAnswer();
      
//       console.log('Setting local description (answer)...');
//       await pc.setLocalDescription(answer);
      
//       console.log('Sending answer...');
//       socket.emit(EVENTS.ANSWER, {
//         callId: call.callId,
//         from: currentUser.id,
//         to: call.initiatorId,
//         sdp: pc.localDescription,
//       });
      
//       // Only after all setup is complete, update the active call state
//       setActiveCall(call);
//       setIncomingCall(null);
      
//       startCallTimer();
//     } catch (error) {
//       console.error('Error accepting call:', error);
//       endCall();
//     }
//   };

//   const rejectCall = () => {
//     if (!incomingCall) return;
    
//     socket.emit('rejectCall', {
//       callId: incomingCall.callId,
//       userId: currentUser.id,
//     });
    
//     // Clean up any partially set up state
//     setIncomingCall(null);
    
//     // Make sure all media and connections are cleaned up
//     if (localStream) {
//       localStream.getTracks().forEach((track) => {
//         track.stop();
//       });
//       setLocalStream(null);
//     }
    
//     if (peerConnection) {
//       peerConnection.close();
//       setPeerConnection(null);
//     }
//   };

//   const toggleMute = () => {
//     if (localStream) {
//       const audioTracks = localStream.getAudioTracks();
//       audioTracks.forEach((track) => {
//         track.enabled = !track.enabled;
//       });
//       setIsMuted(!isMuted);
//     }
//   };

//   const toggleVideo = () => {
//     if (localStream && activeCall?.callType === 'video') {
//       const videoTracks = localStream.getVideoTracks();
//       videoTracks.forEach((track) => {
//         track.enabled = !track.enabled;
//       });
//       setIsVideoOff(!isVideoOff);
//     }
//   };

//   // Add this function to debug remote stream status
//   const logStreamStatus = () => {
//     console.log('Remote stream status:', remoteStream ? 'Available' : 'Null');
//     if (remoteStream) {
//       console.log('Remote tracks:', remoteStream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', '));
//     }
//     console.log('Local stream status:', localStream ? 'Available' : 'Null');
//     if (localStream) {
//       console.log('Local tracks:', localStream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', '));
//     }
//   };

//   useEffect(() => {
//     // Log whenever remoteStream changes
//     console.log('Remote stream updated:', remoteStream ? 'Available' : 'Not available');
//     if (remoteStream) {
//       console.log('Remote stream tracks:', 
//         remoteStream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', '));
//     }
//   }, [remoteStream]);

//   return (
//     <>
//       {incomingCall && !activeCall && (
//         <IncomingCallModal call={incomingCall} onAccept={acceptCall} onReject={rejectCall} />
//       )}
//       {activeCall && activeCall.callType === 'voice' && (
//         <VoiceCallModal
//           call={activeCall}
//           duration={formatTime(callTimer)}
//           isMuted={isMuted}
//           onToggleMute={toggleMute}
//           onEndCall={endCall}
//           remoteStream={remoteStream}
//           localStream={localStream}
//         />
//       )}
//       {activeCall && activeCall.callType === 'video' && (
//         <VideoCallModal
//           call={activeCall}
//           duration={formatTime(callTimer)}
//           isMuted={isMuted}
//           isVideoOff={isVideoOff}
//           onToggleMute={toggleMute}
//           onToggleVideo={toggleVideo}
//           onEndCall={endCall}
//           remoteStream={remoteStream}
//           localStream={localStream}
//           currentUser={currentUser}
//         />
//       )}
//     </>
//   );
// });

// export default CallManager;
// CallManager.displayName = 'CallManager';



// import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
// import socket from '../utils/socket';
// import { userService } from '../utils/api';
// import { Phone, Video, MicOff, Mic } from 'lucide-react';

// // Socket event constants
// const EVENTS = {
//   JOIN_ROOM: 'joinRoom',
//   LEAVE_ROOM: 'leaveRoom',
//   OFFER: 'offer',
//   ANSWER: 'answer',
//   ICE_CANDIDATE: 'iceCandidate',
//   ACCEPT_CALL: 'acceptCall',
//   END_CALL: 'endCall',
//   INCOMING_CALL: 'incomingCall'
// };

// const CallManager = forwardRef(({ currentUser }, ref) => {
//   // Call state
//   const [activeCall, setActiveCall] = useState(null);
//   const [incomingCall, setIncomingCall] = useState(null);
//   const [callStatus, setCallStatus] = useState(null); // 'incoming', 'outgoing', 'ongoing'
//   const [callType, setCallType] = useState(null); // 'voice' or 'video'
//   const [isMuted, setIsMuted] = useState(false);
//   const [isVideoOff, setIsVideoOff] = useState(false);
//   const [callTimer, setCallTimer] = useState(0);
  
//   // WebRTC state
//   const peerConnection = useRef(null);
//   const localStream = useRef(null);
//   const remoteStream = useRef(new MediaStream());
//   const timerInterval = useRef(null);
  
//   // UI states
//   const [showIncomingCall, setShowIncomingCall] = useState(false);
//   const [showOutgoingCall, setShowOutgoingCall] = useState(false);
//   const [showOngoingCall, setShowOngoingCall] = useState(false);

//   // ICE servers configuration
//   const iceServers = {
//       iceServers: [
//         { urls: "stun:stun.l.google.com:19302" },
//         { urls: "stun:stun1.google.com:19302" },
//         { urls: "stun:ss-turn2.xirsys.com" }, // Xirsys STUN server
//         {
//           urls: [
//             "turn:ss-turn2.xirsys.com:80?transport=udp",
//             "turn:ss-turn2.xirsys.com:3478?transport=udp",
//             "turn:ss-turn2.xirsys.com:80?transport=tcp",
//             "turn:ss-turn2.xirsys.com:3478?transport=tcp",
//             "turns:ss-turn2.xirsys.com:443?transport=tcp",
//             "turns:ss-turn2.xirsys.com:5349?transport=tcp"
//         ],
//           username: "fJuhMaoIeB0Q_xDmGeGX9gryuKBeSAP4U0rCaC17fX5BjMqhOLLbEK1t99ckWhHEAAAAAGfcIuZzdHJ1bWZyZWk=",
//           credential: "b6f7c7ac-0595-11f0-9657-0242ac140004",
//         }
//       ]
//     };

//   // Expose methods to parent component
//   useImperativeHandle(ref, () => ({
//     initiateCall: (recipientId, chatId, type) => {
//       startCall(recipientId, chatId, type);
//     }
//   }));

//   // Setup socket event listeners
//   useEffect(() => {
//     socket.on(EVENTS.INCOMING_CALL, handleIncomingCallEvent);
//     socket.on(EVENTS.OFFER, handleIncomingOffer);
//     socket.on(EVENTS.ANSWER, handleAnswer);
//     socket.on(EVENTS.ICE_CANDIDATE, handleIceCandidate);
//     socket.on(EVENTS.ACCEPT_CALL, handleCallAccepted);
//     socket.on(EVENTS.END_CALL, handleCallEnded);

//     return () => {
//       socket.off(EVENTS.INCOMING_CALL, handleIncomingCallEvent);
//       socket.off(EVENTS.OFFER, handleIncomingOffer);
//       socket.off(EVENTS.ANSWER, handleAnswer);
//       socket.off(EVENTS.ICE_CANDIDATE, handleIceCandidate);
//       socket.off(EVENTS.ACCEPT_CALL, handleCallAccepted);
//       socket.off(EVENTS.END_CALL, handleCallEnded);
      
//       cleanupCall();
//     };
//   }, []);

//   // Timer for call duration
//   useEffect(() => {
//     if (callStatus === 'ongoing') {
//       startCallTimer();
//     } else {
//       stopCallTimer();
//     }
    
//     return () => stopCallTimer();
//   }, [callStatus]);

//   // Format time for display (MM:SS)
//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
//     const secs = (seconds % 60).toString().padStart(2, '0');
//     return `${mins}:${secs}`;
//   };

//   // Start call timer
//   const startCallTimer = () => {
//     setCallTimer(0);
//     timerInterval.current = setInterval(() => {
//       setCallTimer(prev => prev + 1);
//     }, 1000);
//   };

//   // Stop call timer
//   const stopCallTimer = () => {
//     if (timerInterval.current) {
//       clearInterval(timerInterval.current);
//       timerInterval.current = null;
//     }
//   };

//   // Handle incoming call notification from server
//   const handleIncomingCallEvent = (data) => {
//     console.log('Incoming call notification', data);
    
//     if (activeCall) {
//       console.log('Already in a call, rejecting');
//       return;
//     }
    
//     const callInfo = {
//       id: data.callId,
//       initiatorId: data.initiatorId,
//       chatId: data.chatId,
//       type: data.callType,
//       initiatorName: data.initiatorName || 'User',
//       initiatorImage: data.initiatorImage || null
//     };
    
//     setIncomingCall(callInfo);
//     setShowIncomingCall(true);
//   };

//   // Start a new outgoing call
//   const startCall = async (recipientId, chatId, type) => {
//     try {
//       console.log(`=== INITIATING ${type.toUpperCase()} CALL ===`);
//       console.log(`Calling user ${recipientId} in chat ${chatId}`);
      
//       // Create call record via API
//       console.log('Creating call record via API');
//       const callData = await userService.initiateCall(
//         currentUser.id,
//         recipientId,
//         chatId,
//         type
//       );
      
//       if (!callData || !callData.callId) {
//         console.error('Failed to initiate call - API did not return callId');
//         return;
//       }
      
//       console.log(`Call record created with ID: ${callData.callId}`);
      
//       // Set call state
//       const newCall = {
//         id: callData.callId,
//         recipientId,
//         chatId,
//         type,
//         recipientName: 'User', // You might want to fetch user details separately
//         recipientImage: null
//       };
//       console.log('call',newCall);
      
//       setActiveCall(newCall);
//       setCallType(type);
//       setCallStatus('outgoing');
//       setShowOutgoingCall(true);
      
//       // Get local media stream
//       const constraints = {
//         audio: true,
//         video: type === 'video'
//       };
      
//       console.log('Requesting user media with constraints:', constraints);
//       localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
//       console.log(`Local stream obtained with ${localStream.current.getTracks().length} tracks:`, 
//         localStream.current.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, id: t.id }))
//       );
      
//       // Create and setup peer connection
//       console.log('Creating peer connection');
//       createPeerConnection();
      
//       // Add local tracks to peer connection
//       console.log('Adding local tracks to peer connection');
//       localStream.current.getTracks().forEach(track => {
//         console.log(`Adding ${track.kind} track to peer connection`);
//         peerConnection.current.addTrack(track, localStream.current);
//       });
      
//       // Create offer
//       console.log('Creating offer');
//       const offer = await peerConnection.current.createOffer();
//       console.log('Offer created:', offer);
      
//       console.log('Setting local description (offer)');
//       await peerConnection.current.setLocalDescription(offer);
//       console.log('Local description set');
      
//       // Send offer via socket
//       console.log(`Sending offer to recipient ${recipientId}`);
//       socket.emit(EVENTS.OFFER, {
//         from: currentUser.id,
//         to: recipientId,
//         sdp: offer,
//         callId: callData.callId,
//         callType: type,
//         chatId
//       });
//       console.log('Offer sent, waiting for answer...');
      
//     } catch (error) {
//       console.error('Error initiating call:', error);
//       console.error('Error details:', error.name, error.message, error.stack);
//       cleanupCall();
//     }
//   };

//   // Create WebRTC peer connection
//   const createPeerConnection = () => {
//     try {
//       console.log('Creating new RTCPeerConnection with ICE servers:', iceServers);
//       peerConnection.current = new RTCPeerConnection(iceServers);
      
//       // Log connection state changes
//       peerConnection.current.onconnectionstatechange = () => {
//         console.log(`Connection state changed to: ${peerConnection.current.connectionState}`);
        
//         if (peerConnection.current.connectionState === 'disconnected' || 
//             peerConnection.current.connectionState === 'failed') {
//           console.error(`Connection failed or disconnected: ${peerConnection.current.connectionState}`);
//           endCall();
//         }
//       };
      
//       // Log ICE connection state changes
//       peerConnection.current.oniceconnectionstatechange = () => {
//         console.log(`ICE connection state changed to: ${peerConnection.current.iceConnectionState}`);
        
//         if (peerConnection.current.iceConnectionState === 'failed') {
//           console.error('ICE connection failed - possible firewall or NAT issues');
//         } else if (peerConnection.current.iceConnectionState === 'connected') {
//           console.log('ICE connection established successfully');
//         }
//       };
      
//       // Log ICE gathering state changes
//       peerConnection.current.onicegatheringstatechange = () => {
//         console.log(`ICE gathering state changed to: ${peerConnection.current.iceGatheringState}`);
//       };
      
//       // Log signaling state changes
//       peerConnection.current.onsignalingstatechange = () => {
//         console.log(`Signaling state changed to: ${peerConnection.current.signalingState}`);
//       };
      
//       // Enhanced ICE candidate logging
//       peerConnection.current.onicecandidate = (event) => {
//         if (event.candidate) {
//           console.log('Generated ICE candidate:', {
//             type: event.candidate.type,
//             protocol: event.candidate.protocol,
//             address: event.candidate.address,
//             port: event.candidate.port,
//             candidate: event.candidate.candidate
//           });
      
//           const callObj = activeCall || incomingCall;
//           console.log('callObj',callObj);
//           const recipientId = callObj?.recipientId || callObj?.initiatorId; // Fallback to initiatorId
//           console.log('recipient',recipientId);
      
//           if (!recipientId) {
//             console.error('No recipientId or initiatorId available for ICE candidate');
//             return;
//           }
      
//           console.log(`Sending ICE candidate to user ${recipientId} for call ${callObj.id}`);
//           socket.emit(EVENTS.ICE_CANDIDATE, {
//             from: currentUser.id,
//             to: recipientId,
//             candidate: event.candidate,
//             callId: callObj.id
//           });
//         } else {
//           console.log('ICE candidate gathering completed');
//         }
//       };
      
//       // Log when tracks are added
//       peerConnection.current.ontrack = (event) => {
//         console.log(`Received remote ${event.track.kind} track:`, {
//           kind: event.track.kind,
//           id: event.track.id,
//           label: event.track.label,
//           enabled: event.track.enabled,
//           muted: event.track.muted,
//           readyState: event.track.readyState
//         });
        
//         console.log(`Adding track to remote stream, now has ${remoteStream.current.getTracks().length + 1} tracks`);
//         event.streams[0].getTracks().forEach(track => {
//           remoteStream.current.addTrack(track);
//         });
//       };
      
//     } catch (error) {
//       console.error('Error creating peer connection:', error);
//     }
//   };
  

//   // Handle incoming WebRTC offer
//   const handleIncomingOffer = async (data) => {
//     try {
//       console.log('=== RECEIVED WEBRTC OFFER ===');
//       if (activeCall) {
//         console.warn('Already in a call, ignoring offer');
//         return;
//       }
  
//       const callInfo = {
//         id: data.callId,
//         initiatorId: data.from,
//         chatId: data.chatId,
//         type: data.callType,
//         initiatorName: 'User',
//         initiatorImage: null,
//       };
//       setIncomingCall(callInfo);
//       setShowIncomingCall(true);
  
//       // Create peer connection if not exists
//       if (!peerConnection.current) createPeerConnection();
  
//       // Set remote offer
//       await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
  
//       // Wait for user to accept (handled in acceptCall)
//     } catch (error) {
//       console.error('Error handling incoming offer:', error);
//     }
//   };

//   // Accept incoming call
//   const acceptCall = async () => {
//     try {
//       console.log('=== ACCEPTING INCOMING CALL ===');
//       if (!incomingCall) return;
  
//       // Get local stream
//       const constraints = { audio: true, video: incomingCall.type === 'video' };
//       localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
  
//       // Add tracks to peer connection
//       localStream.current.getTracks().forEach(track => peerConnection.current.addTrack(track, localStream.current));
  
//       // Create and send answer
//       const answer = await peerConnection.current.createAnswer();
//       await peerConnection.current.setLocalDescription(answer);
  
//       socket.emit(EVENTS.ANSWER, {
//         from: currentUser.id,
//         to: incomingCall.initiatorId,
//         sdp: answer,
//         callId: incomingCall.id,
//       });
  
//       socket.emit(EVENTS.ACCEPT_CALL, {
//         from: currentUser.id,
//         to: incomingCall.initiatorId,
//         callId: incomingCall.id,
//       });
  
//       setActiveCall(incomingCall);
//       setCallType(incomingCall.type);
//       setCallStatus('ongoing');
//       setShowIncomingCall(false);
//       setShowOngoingCall(true);
//       setIncomingCall(null);
  
//     } catch (error) {
//       console.error('Error accepting call:', error);
//       rejectCall();
//     }
//   };

//   // Reject incoming call
//   const rejectCall = () => {
//     console.log('Rejecting call', incomingCall);
    
//     if (incomingCall) {
//       socket.emit(EVENTS.END_CALL, { 
//         callId: incomingCall.id,
//         to: incomingCall.initiatorId,
//         from: currentUser.id
//       });
//     }
    
//     setShowIncomingCall(false);
//     setIncomingCall(null);
//     cleanupCall();
//   };

//   // Handle WebRTC answer to our offer
//   const handleAnswer = async (data) => {
//     try {
//       console.log('=== RECEIVED WEBRTC ANSWER ===');
//       console.log('Answer data:', {
//         from: data.from,
//         callId: data.callId,
//         sdpType: data.sdp?.type
//       });
  
//       if (!peerConnection.current || !activeCall) {
//         console.error('No active call or peer connection');
//         return;
//       }
  
//       console.log('Setting remote description (answer)');
//       await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
//       console.log('Remote description set successfully');
  
//       // Process queued ICE candidates
//       if (peerConnection.current.queuedCandidates?.length) {
//         console.log(`Processing ${peerConnection.current.queuedCandidates.length} queued ICE candidates`);
//         for (const candidate of peerConnection.current.queuedCandidates) {
//           console.log('Adding queued ICE candidate:', candidate);
//           await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
//         }
//         peerConnection.current.queuedCandidates = [];
//         console.log('All queued ICE candidates processed');
//       }
  
//       console.log('Call setup complete, waiting for ICE connection');
//     } catch (error) {
//       console.error('Error handling answer:', error);
//     }
//   };

//   // Handle incoming ICE candidate
//   const handleIceCandidate = async (data) => {
//     try {
//       console.log('=== RECEIVED ICE CANDIDATE ===');
//       console.log('ICE candidate data:', {
//         from: data.from,
//         callId: data.callId,
//         candidateType: data.candidate.type,
//         candidateProtocol: data.candidate.protocol,
//         candidateAddress: data.candidate.address,
//         candidatePort: data.candidate.port
//       });
  
//       if (!peerConnection.current) {
//         console.error('No peer connection available to add ICE candidate to');
//         return;
//       }
  
//       if (!peerConnection.current.remoteDescription) {
//         console.log('Remote description not set yet, queuing ICE candidate');
//         // Queue candidate (you could store in state or a ref)
//         if (!peerConnection.current.queuedCandidates) {
//           peerConnection.current.queuedCandidates = [];
//         }
//         peerConnection.current.queuedCandidates.push(data.candidate);
//         return;
//       }
  
//       console.log('Adding ICE candidate to peer connection');
//       await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
//       console.log('ICE candidate added successfully');
//     } catch (error) {
//       console.error('Error handling ICE candidate:', error);
//       console.error('Error details:', error.name, error.message, error.stack);
//     }
//   };

//   // Handle call accepted event
//   const handleCallAccepted = (data) => {
//     console.log('Call accepted', data);
    
//     if (activeCall && activeCall.id === data.callId) {
//       setCallStatus('ongoing');
//       setShowOutgoingCall(false);
//       setShowOngoingCall(true);
//     }
//   };

//   // Handle call ended event
//   const handleCallEnded = (data) => {
//     console.log('Call ended event received', data);
    
//     const callId = activeCall?.id || incomingCall?.id;
    
//     if (callId === data.callId) {
//       cleanupCall();
//     }
//   };

//   // End active call
//   const endCall = () => {
//     console.log('Ending call', activeCall);
    
//     if (activeCall) {
//       const recipientId = activeCall.recipientId || activeCall.initiatorId;
      
//       socket.emit(EVENTS.END_CALL, { 
//         callId: activeCall.id,
//         from: currentUser.id,
//         to: recipientId
//       });
//     }
    
//     cleanupCall();
//   };

//   // Toggle mute
//   const toggleMute = () => {
//     if (localStream.current) {
//       const audioTracks = localStream.current.getAudioTracks();
//       if (audioTracks.length > 0) {
//         const track = audioTracks[0];
//         track.enabled = !track.enabled;
//         setIsMuted(!track.enabled);
//       }
//     }
//   };

//   // Toggle video
//   const toggleVideo = () => {
//     if (localStream.current && callType === 'video') {
//       const videoTracks = localStream.current.getVideoTracks();
//       if (videoTracks.length > 0) {
//         const track = videoTracks[0];
//         track.enabled = !track.enabled;
//         setIsVideoOff(!track.enabled);
//       }
//     }
//   };

//   // Clean up call resources
//   const cleanupCall = () => {
//     console.log('=== CLEANING UP CALL RESOURCES ===');
    
//     // Stop local media tracks
//     if (localStream.current) {
//       console.log(`Stopping ${localStream.current.getTracks().length} local tracks`);
//       localStream.current.getTracks().forEach(track => {
//         console.log(`Stopping ${track.kind} track (${track.id})`);
//         track.stop();
//       });
//       localStream.current = null;
//     } else {
//       console.log('No local stream to cleanup');
//     }
    
//     // Clear remote stream
//     if (remoteStream.current) {
//       const tracks = remoteStream.current.getTracks();
//       console.log(`Removing ${tracks.length} tracks from remote stream`);
//       tracks.forEach(track => {
//         console.log(`Removing ${track.kind} track (${track.id}) from remote stream`);
//         remoteStream.current.removeTrack(track);
//       });
//       remoteStream.current = new MediaStream();
//       console.log('Created new empty remote stream');
//     }
    
//     // Close peer connection
//     if (peerConnection.current) {
//       console.log('Closing peer connection');
//       console.log('Final connection state:', peerConnection.current.connectionState);
//       console.log('Final ICE connection state:', peerConnection.current.iceConnectionState);
//       console.log('Final signaling state:', peerConnection.current.signalingState);
//       peerConnection.current.close();
//       peerConnection.current = null;
//       console.log('Peer connection closed and set to null');
//     } else {
//       console.log('No peer connection to close');
//     }
    
//     // Reset state
//     console.log('Resetting call state');
//     stopCallTimer();
//     setActiveCall(null);
//     setCallStatus(null);
//     setCallType(null);
//     setIsMuted(false);
//     setIsVideoOff(false);
//     setShowIncomingCall(false);
//     setShowOutgoingCall(false);
//     setShowOngoingCall(false);
//     console.log('Call state reset complete');
//   };

//   // Outgoing call UI
//   const renderOutgoingCallUI = () => (
//     <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col items-center justify-center z-50">
//       <div className="text-center mb-12">
//         <div className="w-32 h-32 mx-auto bg-white/10 backdrop-blur rounded-full flex items-center justify-center mb-6">
//           {activeCall?.recipientImage ? (
//             <img 
//               src={activeCall.recipientImage} 
//               alt={activeCall.recipientName} 
//               className="w-28 h-28 rounded-full object-cover"
//             />
//           ) : (
//             <span className="text-5xl text-white font-bold">
//               {activeCall?.recipientName?.charAt(0).toUpperCase() || 'U'}
//             </span>
//           )}
//         </div>
//         <h3 className="text-white text-2xl font-bold">{activeCall?.recipientName || 'User'}</h3>
//         <p className="text-white/70 text-lg mt-1">Calling...</p>
//       </div>
      
//       <button
//         onClick={endCall}
//         className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
//       >
//         <Phone size={24} className="transform rotate-135" />
//       </button>
//     </div>
//   );

//   return (
//     <>
//       {/* Incoming call modal */}
//       {showIncomingCall && incomingCall && (
//         <IncomingCallModal 
//           call={incomingCall} 
//           onAccept={acceptCall} 
//           onReject={rejectCall} 
//         />
//       )}
      
//       {/* Outgoing call UI */}
//       {showOutgoingCall && activeCall && renderOutgoingCallUI()}
      
//       {/* Ongoing call modals */}
//       {showOngoingCall && activeCall && callType === 'voice' && (
//         <VoiceCallModal
//           call={activeCall}
//           duration={formatTime(callTimer)}
//           isMuted={isMuted}
//           onToggleMute={toggleMute}
//           onEndCall={endCall}
//           remoteStream={remoteStream.current}
//           localStream={localStream.current}
//         />
//       )}
      
//       {showOngoingCall && activeCall && callType === 'video' && (
//         <VideoCallModal
//           call={activeCall}
//           duration={formatTime(callTimer)}
//           isMuted={isMuted}
//           isVideoOff={isVideoOff}
//           onToggleMute={toggleMute}
//           onToggleVideo={toggleVideo}
//           onEndCall={endCall}
//           remoteStream={remoteStream.current}
//           localStream={localStream.current}
//           currentUser={currentUser}
//         />
//       )}
//     </>
//   );
// });

// export default CallManager;
CallManager.displayName = 'CallManager';