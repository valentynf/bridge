import { useContext } from "react";
import { SocketContext } from "../context/SocketContext";

export const useSocket = () => {
    const socket = useContext(SocketContext);
    if (!socket) {
        throw new Error("useSocket must be used within SocketContextProvider");
    }
    return socket;
};
