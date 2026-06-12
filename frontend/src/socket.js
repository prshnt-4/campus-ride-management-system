import {io} from "socket.io-client";

const socket = io("https://campus-ride-management-system-backend.onrender.com");

export default socket;