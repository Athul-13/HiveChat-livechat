import { useState, useEffect, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import socket from "../utils/socket";
import VideoCallModal from "./VideoCallModal";
import VoiceCallModal from "./VoiceCallModal";
import IncomingCallModal from "./IncomingCallModal";
import { callService } from "../utils/api";

const CallManager = ({ currentUser, callManagerRef }) => {
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState("00:00");
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  
  const agoraClient = useRef(null);
  const durationInterval = useRef(null);
  const callStartTime = useRef(null);

  // Initialize Agora client when component mounts
  useEffect(() => {
    AgoraRTC.setLogLevel(4);
    
    agoraClient.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8", logLevel: "ERROR" });
    
    // Expose methods for the parent component to call
    if (callManagerRef) {
      callManagerRef.current = {
        initiateCall: handleInitiateCall,
        endCall: handleEndCall
      };
    }

    // Set up socket listeners for incoming calls
    socket.on("incomingCall", handleIncomingCall);
    socket.on("callEnded", handleCallEndedByPeer);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    
    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callEnded", handleCallEndedByPeer);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      handleEndCall();
    };
  }, []);

  // Handle when call is ended by the other user
  const handleCallEndedByPeer = () => {
    handleEndCall();
  };

  // Handle when call is accepted by the other user
  const handleCallAccepted = () => {
    // Start call duration timer
    startCallDurationTimer();
  };

  // Handle when call is rejected by the other user
  const handleCallRejected = () => {
    handleEndCall();
  };

  // Start timer to track call duration
  const startCallDurationTimer = () => {
    // Clear any existing timer
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    
    callStartTime.current = Date.now();
    
    durationInterval.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - callStartTime.current) / 1000);
      const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
      const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
      setCallDuration(`${minutes}:${seconds}`);
    }, 1000);
  };

  // Handle incoming call request
  const handleIncomingCall = async (callData) => {
    const { callerId, callerName, callerProfilePicture, chatId, callType, token, channel, callId } = callData;
    
    // Set incoming call data
    setActiveCall({
      callId,
      recipientId: callerId,
      recipientName: callerName,
      recipientImage: callerProfilePicture,
      chatId,
      type: callType,
      token,
      channel,
      isIncoming: true
    });
    
    setShowIncomingCall(true);
  };

  // Initiate a call to another user
  const handleInitiateCall = async (recipientId, chatId, callType, recipientName, recipientImage) => {
    try {
      // Get call details from your backend (token, channel name, etc.)
      const response = await callService.initiateCall(recipientId, chatId, callType);

      if (!response || !response.agoraData.token || !response.agoraData.channel) {
        console.error("Invalid response from callService:", response);
        return;
      }
      
      const { token, channel, callId } = response.agoraData;
      
      // Set active call state
      setActiveCall({
        callId,
        recipientId,
        recipientName,
        recipientImage,
        chatId,
        type: callType,
        token,
        channel,
        isIncoming: false
      });
      
      // Notify recipient through socket
      socket.emit("callUser", {
        recipientId,
        chatId,
        callType,
        token,
        channel,
        callId
      });
      
      // Join Agora channel
      await joinChannel(token, channel, callType, callId);
      
    } catch (error) {
      console.error("Error initiating call:", error);
    }
  };

  // Join Agora channel when a call starts
  const joinChannel = async (token, channel, callType, callId) => {
    try {
      // Call the joinCall API endpoint if this is an incoming call (not the initiator)
      if (activeCall && activeCall.isIncoming && callId) {
        try {
          const data = await callService.join(callId)
          
          // Use the returned token and channel if available
          if (data.agoraData) {
            token = data.agoraData.token || token;
            channel = data.agoraData.channelName || channel;
          }
        } catch (error) {
          console.error("Error calling joinCall API:", error);
        }
      }
      
      // Initialize Agora client
      await agoraClient.current.join(
        import.meta.env.VITE_AGORA_APP_ID,
        channel,
        token,
        currentUser.id
      );
      
      // Create and publish local stream
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      let localVideoTrack = null;
      
      if (callType === "video") {
        localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        setIsVideoOff(false);
      } else {
        setIsVideoOff(true);
      }
      
      const localStreamTracks = localVideoTrack 
        ? [localAudioTrack, localVideoTrack] 
        : [localAudioTrack];
        
      await agoraClient.current.publish(localStreamTracks);
      
      // Save local stream for UI
      const newLocalStream = new MediaStream();
      
      if (localAudioTrack) {
        // Get the media track from Agora's audio track
        const audioTrack = localAudioTrack.getMediaStreamTrack();
        newLocalStream.addTrack(audioTrack);
      }
      
      if (localVideoTrack) {
        // Get the media track from Agora's video track
        const videoTrack = localVideoTrack.getMediaStreamTrack();
        newLocalStream.addTrack(videoTrack);
      }
      
      setLocalStream(newLocalStream);
      
      // Listen for remote users joining
      agoraClient.current.on("user-published", handleUserPublished);
      agoraClient.current.on("user-unpublished", handleUserUnpublished);
      
      // Start call duration timer
      startCallDurationTimer();
    } catch (error) {
      console.error("Error joining channel:", error);
      handleEndCall();
    }
  };

  // Handle when remote users publish audio/video streams
  const handleUserPublished = async (user, mediaType) => {
    await agoraClient.current.subscribe(user, mediaType);
    
    // Create or update the remote stream
    const newRemoteStream = remoteStream || new MediaStream();
    
    if (mediaType === "audio" && user.audioTrack) {
      // Get the media track from Agora's audio track
      const audioTrack = user.audioTrack.getMediaStreamTrack();
      
      // Remove any existing audio tracks
      newRemoteStream.getAudioTracks().forEach(track => {
        newRemoteStream.removeTrack(track);
      });
      
      // Add the new audio track
      newRemoteStream.addTrack(audioTrack);
      
      // Play the audio
      user.audioTrack.play();
    }
    
    if (mediaType === "video" && user.videoTrack) {
      // Get the media track from Agora's video track
      const videoTrack = user.videoTrack.getMediaStreamTrack();
      
      // Remove any existing video tracks
      newRemoteStream.getVideoTracks().forEach(track => {
        newRemoteStream.removeTrack(track);
      });
      
      // Add the new video track
      newRemoteStream.addTrack(videoTrack);
    }
    
    setRemoteStream(newRemoteStream);
  };

  // Handle when remote users stop publishing audio/video
  const handleUserUnpublished = (user, mediaType) => {
    if (!remoteStream) return;
    
    const newRemoteStream = new MediaStream();
    
    // Copy over tracks except the unpublished one
    if (mediaType === "audio") {
      // Keep only video tracks
      remoteStream.getVideoTracks().forEach(track => {
        newRemoteStream.addTrack(track);
      });
    } else if (mediaType === "video") {
      // Keep only audio tracks
      remoteStream.getAudioTracks().forEach(track => {
        newRemoteStream.addTrack(track);
      });
    }
    
    setRemoteStream(newRemoteStream);
  };

  // Handle ending the call
  const handleEndCall = async () => {
    try {
      // Stop call duration timer
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Stop and close all local tracks first
      if (agoraClient.current && agoraClient.current.localTracks) {
        // Get all local tracks (audio and video)
        const localTracks = agoraClient.current.localTracks;
        
        // Stop and close each track
        for (const track of localTracks) {
          track.stop();
          track.close();
        }
      }
      
      // Leave the channel and clean up
      if (agoraClient.current) {
        agoraClient.current.removeAllListeners();
        await agoraClient.current.leave();
      }
      
      // Notify other user that call has ended if we have an active call
      if (activeCall) {
        socket.emit("endCall", {
          recipientId: activeCall.recipientId,
          chatId: activeCall.chatId
        });
      }
      
      // Reset state
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
      setIsMuted(false);
      setIsVideoOff(false);
      setCallDuration("00:00");
      setShowIncomingCall(false);
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  // Toggle microphone
  const handleToggleMute = () => {
    if (agoraClient.current) {
      const localAudioTrack = agoraClient.current.localTracks?.find(track => track.trackMediaType === "audio");
      
      if (localAudioTrack) {
        if (isMuted) {
          localAudioTrack.setEnabled(true);
        } else {
          localAudioTrack.setEnabled(false);
        }
        setIsMuted(!isMuted);
      }
    }
  };

  // Toggle camera
  const handleToggleVideo = async () => {
    if (!activeCall || activeCall.type !== "video") return;
    
    // Get the current local video track
    const localVideoTrack = agoraClient.current.localTracks?.find(track => track.trackMediaType === "video");
    
    try {
      if (isVideoOff && !localVideoTrack) {
        // Create and publish video track
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        await agoraClient.current.publish(videoTrack);
        
        // Update local stream with new video track
        if (localStream) {
          const newLocalStream = new MediaStream();
          
          // Keep existing audio tracks
          localStream.getAudioTracks().forEach(track => {
            newLocalStream.addTrack(track);
          });
          
          // Add new video track
          const newVideoTrack = videoTrack.getMediaStreamTrack();
          newLocalStream.addTrack(newVideoTrack);
          
          setLocalStream(newLocalStream);
        }
      } else if (localVideoTrack) {
        // Unpublish and close video track
        await agoraClient.current.unpublish(localVideoTrack);
        localVideoTrack.stop();
        localVideoTrack.close();
        
        // Update local stream without video
        if (localStream) {
          const newLocalStream = new MediaStream();
          
          // Keep only audio tracks
          localStream.getAudioTracks().forEach(track => {
            newLocalStream.addTrack(track);
          });
          
          setLocalStream(newLocalStream);
        }
      }
      
      setIsVideoOff(!isVideoOff);
    } catch (error) {
      console.error("Error toggling video:", error);
    }
  };

  // Accept an incoming call
  const handleAcceptCall = async () => {
    if (!activeCall) return;
    
    setShowIncomingCall(false);
    
    try {
      await joinChannel(activeCall.token, activeCall.channel, activeCall.type, activeCall.callId);
      
      // Notify caller that call was accepted
      socket.emit("callAccepted", {
        callerId: activeCall.recipientId,
        chatId: activeCall.chatId
      });
    } catch (error) {
      console.error("Error accepting call:", error);
      handleEndCall();
    }
  };

  // Reject an incoming call
  const handleRejectCall = () => {
    if (!activeCall) return;
    
    // Notify caller that call was rejected
    socket.emit("callRejected", {
      callerId: activeCall.recipientId,
      chatId: activeCall.chatId
    });
    
    // Reset state
    setActiveCall(null);
    setShowIncomingCall(false);
  };

  // If no active call, render nothing
  if (!activeCall) {
    return null;
  }

  // Show incoming call modal
  if (showIncomingCall) {
    return (
      <IncomingCallModal
        call={{
          callerName: activeCall.recipientName,
          callerProfilePicture: activeCall.recipientImage,
          callType: activeCall.type
        }}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    );
  }

  // Render appropriate call modal based on call type
  return activeCall.type === "video" ? (
    <VideoCallModal
      call={activeCall}
      duration={callDuration}
      isMuted={isMuted}
      isVideoOff={isVideoOff}
      onToggleMute={handleToggleMute}
      onToggleVideo={handleToggleVideo}
      onEndCall={handleEndCall}
      remoteStream={remoteStream}
      localStream={localStream}
      currentUser={currentUser}
    />
  ) : (
    <VoiceCallModal
      call={activeCall}
      duration={callDuration}
      isMuted={isMuted}
      onToggleMute={handleToggleMute}
      onEndCall={handleEndCall}
      remoteStream={remoteStream}
    />
  );
};

export default CallManager;