import type { Socket } from "socket.io";
import { parse } from "cookie";
import { verifyToken } from "../functions/jwt.js";

type NextFunction = (err?: Error) => void;

export const socketAuth = (socket: Socket, next: NextFunction): void => {
    const rawCookies = socket.handshake.headers.cookie;
    if (!rawCookies) {
        return next(new Error("Not authenticated"));
    }
    const { token } = parse(rawCookies);
    if (!token) {
        return next(new Error("Not authenticated"));
    }
    try {
        const { userId } = verifyToken(token);
        socket.data.userId = userId;
        next();
    } catch {
        return next(new Error("Invalid or expired token"));
    }
};
