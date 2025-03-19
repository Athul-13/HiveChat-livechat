import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import socket from '../utils/socket';
import IncomingCallModal from './IncomingCallModal';
import VoiceCallModal from './VoiceCallModal';
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

  useImperativeHandle(ref, () => ({
    initiateCall: (recipientId, chatId, callType) => {
      initiateCall(recipientId, chatId, callType);
    },
  }));

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.google.com:19302" },
      { urls: "stun:ss-turn2.xirsys.com" }, // Xirsys STUN server
      {
        urls: [
          "turn:ss-turn2.xirsys.com:80?transport=udp",
          "turn:ss-turn2.xirsys.com:3478?transport=udp",
          "turn:ss-turn2.xirsys.com:80?transport=tcp",
          "turn:ss-turn2.xirsys.com:3478?transport=tcp",
          "turns:ss-turn2.xirsys.com:443?transport=tcp",
          "turns:ss-turn2.xirsys.com:5349?transport=tcp"
        ],
        username: "tW7liSNcaJ0IkfFlfLKyU6MmTb2WRWDdsmIgYr70nZ0OoyuM8Oe8kJAOkJCEzDYdAAAAAGfaUtpzdHJ1bWZyZWk=",
        credential: "1ed86a86-0481-11f0-bc31-0242ac140004"
      }
    ]
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCallTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    setCallTimer(0);
    const interval = setInterval(() => {
      setCallTimer((prev) => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  }, [timerInterval]);

  const setupPeerConnection = useCallback(
    async (callType) => {
      try {
        // Clean up existing connection
        if (peerConnection) {
          peerConnection.close();
          setPeerConnection(null);
        }
  
        // Request media devices first
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: callType === 'video' ? {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          } : false
        };
  
        console.log('Requesting media devices...');
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Media stream obtained:', stream.getTracks().map(t => t.kind));

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          console.error('No audio tracks in local stream!');
        }
        
        // Create new connection
        console.log('Creating new RTCPeerConnection');
        const pc = new RTCPeerConnection(iceServers);
        console.log('PC initial states - signaling:', pc.signalingState, 
          'ice:', pc.iceConnectionState, 
          'connection:', pc.connectionState);
        
        // Add tracks to peer connection
        console.log(`Adding ${stream.getTracks().length} tracks to peer connection`);
        stream.getTracks().forEach(track => {
          console.log(`Adding ${track.kind} track to peer connection (enabled: ${track.enabled})`);
          pc.addTrack(track, stream);
        });
  
        // Set up event handlers
        pc.ontrack = (event) => {
          console.log('ontrack event fired');
          console.log('Received track:', event.track);
          console.log('Streams:', event.streams);
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
            console.log('Remote stream set with tracks:', event.streams[0].getTracks());
          } else {
            console.error('No streams in ontrack event');
          }
        };
  
        pc.oniceconnectionstatechange = () => {
          console.log('ICE Connection State:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log('ICE connected - media should start flowing');
          } else if (pc.iceConnectionState === 'failed') {
            console.error('ICE connection failed');
            // Handle failure without calling endCall
            if (pc.signalingState !== 'closed') {
              pc.close();
            }
          }
        };
  
        // Update states only after successful setup
        setLocalStream(stream);
        setPeerConnection(pc);

        pc.onconnectionstatechange = () => {
          console.log('Connection state changed:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            console.log('Peer connection established successfully');
            console.log('Tracks in local stream:', stream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', '));
            console.log('Tracks in remote stream:', remoteStream ? remoteStream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', ') : 'No remote stream yet');
          } else if (pc.connectionState === 'failed') {
            console.error('Connection failed');
            endCall();
          }
        };
  
        pc.onsignalingstatechange = () => {
          console.log('Signaling state changed:', pc.signalingState);
        };
        return pc;
      } catch (error) {
        console.error('Error in setupPeerConnection:', error);
        throw error;
      }
    },
    [iceServers]
  );

  const endCall = useCallback(() => {
    if (!activeCall && !incomingCall) return;
    console.log('Ending call. Active call:', activeCall?.callId);
    console.trace('Call stack for endCall');

    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    // First, send end call signal if we have an active call
    if (activeCall) {
      socket.emit(EVENTS.END_CALL, { callId: activeCall.callId });
      socket.emit(EVENTS.LEAVE_ROOM, activeCall.chatId);
    }
    
    // Clean up media streams
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
    }
    
    // Close peer connection
    if (peerConnection) {
      console.log('Closing peer connection');
      peerConnection.close();
    }
    
    // Reset all states
    setActiveCall(null);
    setIncomingCall(null); // Also clear any incoming call data
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
    setCallTimer(0);
    setIsMuted(false);
    setIsVideoOff(false);
  }, [activeCall, incomingCall, localStream, peerConnection, timerInterval]);

  const handleOffer = useCallback(
    async (data) => {
      console.log('Received offer:', data);
      if (data.to === currentUser.id) {
        try {
          // Don't set up new connection if we're already in a call
          if (activeCall) {
            console.log('Already in a call, rejecting offer');
            socket.emit('rejectCall', {
              callId: data.callId,
              userId: currentUser.id,
            });
            return;
          }
  
          // Set the incoming call data - DO NOT set activeCall yet
          setIncomingCall({
            callId: data.callId,
            chatId: data.chatId,
            initiatorId: data.from,
            callType: data.callType,
            sdp: data.sdp  // IMPORTANT: Store the offer SDP
          });
        } catch (error) {
          console.error('Error handling offer:', error);
          endCall();
        }
      }
    },
    [currentUser.id, activeCall, endCall]
  );

  const handleAnswer = useCallback(async (data) => {
    if (data.to === currentUser.id && peerConnection) {
      try {
        console.log('Received answer SDP:', data.sdp);
        const remoteDesc = new RTCSessionDescription(data.sdp);
        console.log('Setting remote description with type:', remoteDesc.type);
        await peerConnection.setRemoteDescription(remoteDesc);
        console.log('Remote description set successfully');
        startCallTimer();
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    } else {
      console.log('Answer ignored - no peer connection or wrong user');
    }
  }, [currentUser.id, peerConnection, startCallTimer]);

  const handleIceCandidate = useCallback(async (data) => {
    if (data.to === currentUser.id && peerConnection) {
      try {
        console.log('Received ICE candidate:', data.candidate);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('ICE candidate added successfully');
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }, [currentUser.id, peerConnection]);

  const initiateCall = async (recipientId, chatId, callType) => {
    let pc = null;
    try {
      console.log('Initiating call with:', { recipientId, chatId, callType });
      const data = await userService.initiateCall(currentUser.id, recipientId, chatId, callType);
      console.log('API call succeeded:', data);
  
      const call = {
        callId: data.callId,
        chatId,
        recipientId,
        callType,
        isInitiator: true,
      };
      setActiveCall(call);
  
      // Setup peer connection
      pc = await setupPeerConnection(callType);
      
      // Join the room first
      console.log('Joining room:', chatId);
      socket.emit(EVENTS.JOIN_ROOM, chatId);
  
      // Create offer with explicit constraints
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      };
      
      console.log('Creating offer with options:', offerOptions);
      const offer = await pc.createOffer(offerOptions);
      console.log('Offer created:', offer);
  
      console.log('Setting local description...');
      await pc.setLocalDescription(offer);
      console.log('Local description set. Signaling state:', pc.signalingState);
  
      // Send the offer immediately
      const offerData = {
        callId: call.callId,
        from: currentUser.id,
        to: recipientId,
        sdp: pc.localDescription,
        callType,
        chatId
      };
      
      socket.emit(EVENTS.OFFER, offerData);
      console.log('Offer sent');
  
      // Set up ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate.candidate);
          socket.emit(EVENTS.ICE_CANDIDATE, {
            callId: call.callId,
            from: currentUser.id,
            to: recipientId,
            candidate: event.candidate,
          });
        }
      };

      // Set up connection state monitoring with timeout
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('Connection establishment timed out - continuing anyway');
          resolve();
        }, 5000); // 5 second timeout
        
        const existingHandler = pc.onconnectionstatechange;
        pc.onconnectionstatechange = () => {
          console.log('Connection state changed:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            clearTimeout(timeout);
            resolve();
          } else if (pc.connectionState === 'failed') {
            clearTimeout(timeout);
            reject(new Error('Connection failed'));
          }
          // Call the existing handler if there was one
          if (existingHandler) existingHandler.call(pc);
        };
      });

      try {
        await connectionPromise;
        console.log('Connection established or timed out - continuing');
      } catch (error) {
        console.error('Connection error:', error);
        // Don't call endCall here, just continue
      }
  
      // Monitor connection state
      pc.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          console.error('ICE connection failed - investigating...');
          // Optionally delay endCall to allow recovery
          setTimeout(() => {
            if (pc.iceConnectionState === 'failed') {
              endCall();
            }
          }, 2000); // Give it 2 seconds to recover
        }
      };
      
      pc.onconnectionstatechange = () => {
        console.log('Connection state changed:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log('Peer connection established successfully');
          console.log('Checking remote tracks availability...');
          const senders = pc.getSenders();
          const receivers = pc.getReceivers();
          console.log('Senders:', senders.length, 'Receivers:', receivers.length);
        } else if (pc.connectionState === 'failed') {
          console.error('Connection failed');
          setTimeout(() => {
            if (pc.connectionState === 'failed') {
              endCall();
            }
          }, 2000);
        }
      };
  
    } catch (error) {
      console.error('Error in initiateCall:', error);
      if (pc) {
        console.log('Cleaning up failed connection...');
        if (pc.signalingState !== 'closed') {
          pc.close();
        }
      }
      endCall();
    }
  };

  useEffect(() => {
    const handleIncomingCall = (callData) => {
      console.log('Incoming call:', callData);
      
      // If already in a call, reject new incoming calls
      if (activeCall) {
        console.log('Already in a call, rejecting incoming call');
        socket.emit('rejectCall', {
          callId: callData.callId,
          userId: currentUser.id,
        });
        return;
      }
      
      setIncomingCall(callData);
    };
  
    const handleCallAccepted = (data) => {
      console.log('Call accepted:', data);
      if (activeCall && activeCall.callId === data.callId) {
        startCallTimer();
      }
    };
  
    const handleCallEnded = (data) => {
      console.log('Call ended:', data);
      // Make sure we clean up everything if our call was ended remotely
      endCall();
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
    };
  }, [currentUser.id, handleOffer, handleAnswer, handleIceCandidate, activeCall, endCall, startCallTimer]);

  const acceptCall = async () => {
    try {
      if (!incomingCall) return;
  
      const call = {
        callId: incomingCall.callId,
        chatId: incomingCall.chatId,
        initiatorId: incomingCall.initiatorId,
        callType: incomingCall.callType,
        isInitiator: false,
      };
  
      // First set up the peer connection
      const pc = await setupPeerConnection(call.callType);
      
      // Join the room
      console.log('Joining room:', call.chatId);
      socket.emit(EVENTS.JOIN_ROOM, call.chatId);
  
      // IMPORTANT: Set remote description (offer) before creating answer
      // The offer should be available in incomingCall.sdp
      if (!incomingCall.sdp) {
        console.error('Missing offer SDP in incoming call data');
        endCall();
        return;
      }
      
      console.log('Setting remote description (offer)...');
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
      console.log('Remote description set successfully');
  
      // Notify caller that call was accepted
      socket.emit(EVENTS.ACCEPT_CALL, {
        callId: call.callId,
        from: currentUser.id,
        to: call.initiatorId,
        chatId: call.chatId,
      });
  
      // Set up ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(EVENTS.ICE_CANDIDATE, {
            callId: call.callId,
            from: currentUser.id,
            to: call.initiatorId,
            candidate: event.candidate,
          });
        }
      };
      
      // Create and send answer (now valid since remote description is set)
      console.log('Creating answer...');
      const answer = await pc.createAnswer();
      
      console.log('Setting local description (answer)...');
      await pc.setLocalDescription(answer);
      
      console.log('Sending answer...');
      socket.emit(EVENTS.ANSWER, {
        callId: call.callId,
        from: currentUser.id,
        to: call.initiatorId,
        sdp: pc.localDescription,
      });
      
      // Only after all setup is complete, update the active call state
      setActiveCall(call);
      setIncomingCall(null);
      
      startCallTimer();
    } catch (error) {
      console.error('Error accepting call:', error);
      endCall();
    }
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    
    socket.emit('rejectCall', {
      callId: incomingCall.callId,
      userId: currentUser.id,
    });
    
    // Clean up any partially set up state
    setIncomingCall(null);
    
    // Make sure all media and connections are cleaned up
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
      setLocalStream(null);
    }
    
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && activeCall?.callType === 'video') {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Add this function to debug remote stream status
  const logStreamStatus = () => {
    console.log('Remote stream status:', remoteStream ? 'Available' : 'Null');
    if (remoteStream) {
      console.log('Remote tracks:', remoteStream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', '));
    }
    console.log('Local stream status:', localStream ? 'Available' : 'Null');
    if (localStream) {
      console.log('Local tracks:', localStream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', '));
    }
  };

  useEffect(() => {
    // Log whenever remoteStream changes
    console.log('Remote stream updated:', remoteStream ? 'Available' : 'Not available');
    if (remoteStream) {
      console.log('Remote stream tracks:', 
        remoteStream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', '));
    }
  }, [remoteStream]);

  return (
    <>
      {incomingCall && !activeCall && (
        <IncomingCallModal call={incomingCall} onAccept={acceptCall} onReject={rejectCall} />
      )}
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
          currentUser={currentUser}
        />
      )}
    </>
  );
});

export default CallManager;
CallManager.displayName = 'CallManager';