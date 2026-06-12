import {io} from "socket.io-client";

const socket = io(
  import.meta.env.VITE_SOCKET_URL ||
  "https://campus-ride-management-system-backend.onrender.com"
);

export default socket;
