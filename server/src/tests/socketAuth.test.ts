import { beforeAll, afterAll, describe, test, expect } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import { socketAuth } from "../middlewares/socketAuth.js";
import { signToken } from "../functions/jwt.js";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "../../../shared/types.js";
import type { SocketData } from "../types/socketio.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

describe("socketAuth", () => {
    let httpServer: HttpServer;
    let io: Server<
        ClientToServerEvents,
        ServerToClientEvents,
        Record<string, never>,
        SocketData
    >;
    let port: number;
    let realUser: {
        id: string;
        email: string;
        nickname: string;
        passwordHash: string;
        createdAt: Date;
    };

    beforeAll(async () => {
        await db.delete(users);
        const [inserted] = await db
            .insert(users)
            .values({
                email: "auth-test@t.com",
                nickname: "authtester",
                passwordHash: "hash",
            })
            .returning();
        realUser = inserted;
        httpServer = createServer();
        io = new Server<
            ClientToServerEvents,
            ServerToClientEvents,
            Record<string, never>,
            SocketData
        >(httpServer);
        io.use(socketAuth);
        return new Promise<void>((resolve) => {
            httpServer.listen(() => {
                port = (httpServer.address() as AddressInfo).port;
                resolve();
            });
        });
    });

    afterAll(() => {
        io.close();
        httpServer.close();
    });

    test("Should reject connection without cookie", () => {
        return new Promise<void>((resolve) => {
            const client: ClientSocket = ioc(`http://localhost:${port}`);
            client.on("connect_error", (err) => {
                expect(err.message).toBe("Not authenticated");
                client.disconnect();
                resolve();
            });
        });
    });

    test("Should reject connection with wrong cookie", () => {
        return new Promise<void>((resolve) => {
            const client: ClientSocket = ioc(`http://localhost:${port}`, {
                extraHeaders: {
                    Cookie: "token=notarealtoken",
                },
            });
            client.on("connect_error", (err) => {
                expect(err.message).toBe("Invalid or expired token");
                client.disconnect();
                resolve();
            });
        });
    });

    test("Should connect successfully with proper cookie", () => {
        return new Promise<void>((resolve) => {
            const userId = realUser.id;
            const token = signToken({ userId });

            io.on("connection", (serverSocket) => {
                expect(serverSocket.data.userId).toBe(userId);
                serverSocket.disconnect();
                resolve();
            });

            ioc(`http://localhost:${port}`, {
                extraHeaders: { Cookie: `token=${token}` },
            });
        });
    });
});
