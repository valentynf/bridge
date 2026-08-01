import { beforeAll, afterAll, describe, test, expect } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import { socketAuth } from "../middlewares/socketAuth.js";
import { signToken } from "../functions/jwt.js";

describe("socketAuth", () => {
    let httpServer: HttpServer;
    let io: Server;
    let port: number;

    beforeAll(async () => {
        httpServer = createServer();
        io = new Server(httpServer);
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
            const userId = "test-user-uuid-123";
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
