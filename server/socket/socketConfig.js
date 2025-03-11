const SOCKET_OPTIONS = {
    cors: {
        origin: process.env.FRONTEND_URL, 
        methods: ["GET", "POST"]
    }
};

const EVENTS = {
    CONNECTION: "connection",
    DISCONNECT: "disconnect",
    NEW_MESSAGE: "newMessage",
    SEND_MESSAGE: "sendMessage",
    NEW_NOTIFICATION: "newNotification",
    JOIN_ROOM: "joinRoom",
    LEAVE_ROOM: "leaveRoom",
    USER_CONNECTED: "userConnected"
  };

module.exports = { SOCKET_OPTIONS, EVENTS };
