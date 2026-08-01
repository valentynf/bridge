import type { Socket } from "socket.io";
import { parse } from "cookie";
import { verifyToken } from "../functions/jwt.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { SocketData } from "../types/socketio.js";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "../../../shared/types.js";

type NextFunction = (err?: Error) => void;

export const socketAuth = async (
    socket: Socket<
        ClientToServerEvents,
        ServerToClientEvents,
        Record<string, never>,
        SocketData
    >,
    next: NextFunction
): Promise<void> => {
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
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId));
        if (!user) {
            return next(new Error("User not found"));
        }
        socket.data.nickname = user.nickname;
        socket.data.userId = userId;
        next();
    } catch {
        return next(new Error("Invalid or expired token"));
    }
};
