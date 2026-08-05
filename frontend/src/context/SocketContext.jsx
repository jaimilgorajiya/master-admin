import { createContext, useEffect, useState } from "react";
import io from "socket.io-client";

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect if not already connected
    const newSocket = io(import.meta.env.VITE_API_BASE_URL, {
        withCredentials: true,
        // Removing explicit websocket transport to allow handshake/upgrade
        // which avoids the "closed before established" warning in React 18
        transports: ["polling", "websocket"] 
    });

    newSocket.on("connect_error", (err) => {
      console.error("🔴 Socket connection error:", err.message);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.off();
        newSocket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
