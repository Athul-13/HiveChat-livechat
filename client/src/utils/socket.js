import io from 'socket.io-client';

// Connect to the server (adjust the URL based on your environment)
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;

const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected to socket server');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

export default socket;