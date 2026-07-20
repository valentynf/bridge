import { createContext, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "../../../shared/types";

const SocketContext = createContext<Socket<
    ServerToClientEvents,
    ClientToServerEvents
> | null>(null);

function SocketContextProvider({ children }: { children: ReactNode }) {
    const [socket] = useState<Socket>(() => io());

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export { SocketContextProvider, SocketContext };
