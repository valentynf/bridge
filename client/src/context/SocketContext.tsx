import { createContext, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

function SocketContextProvider({ children }: { children: ReactNode }) {
    const [socket] = useState<Socket>(() => io());

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export { SocketContextProvider, SocketContext };
