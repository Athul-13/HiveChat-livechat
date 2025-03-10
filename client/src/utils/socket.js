import io from 'socket.io-client';

// Connect to the server (adjust the URL based on your environment)
const SOCKET_URL = 'http://localhost:3000';

const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to socket server');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

export default socket;