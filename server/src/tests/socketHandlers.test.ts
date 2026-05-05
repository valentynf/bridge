import { Server } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { registerSocketEvents } from "../socketHandlers.js";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "../../../shared/types.js";

describe("registerSocketEvents", () => {
    let io: Server,
        clientSocket: ClientSocket<ServerToClientEvents, ClientToServerEvents>;

    beforeAll(() => {
        return new Promise((resolve) => {
            const httpServer = createServer();
            io = new Server(httpServer);
            httpServer.listen(() => {
                const port = (httpServer.address() as AddressInfo).port;
                clientSocket = ioc(`http://localhost:${port}`);
                registerSocketEvents(io);
                clientSocket.on("connect", () => resolve(undefined));
            });
        });
    });

    afterAll(() => {
        io.close();
        clientSocket.disconnect();
    });

    test("create_room", () => {
        const roomCreatedPromise = new Promise<void>((resolve) => {
            clientSocket.on("room_created", (payload) => {
                expect(typeof payload.roomCode).toBe("string");
                expect(payload.roomCode.length).toBe(5);
                resolve();
            });
        });

        const roomJoinedPromise = new Promise<void>((resolve) => {
            clientSocket.on("room_joined", (payload) => {
                expect(payload.roomMembers.length).toBe(1);
                resolve();
            });
        });
        clientSocket.emit("create_room", { playerName: "testUser1" });
        return Promise.all([roomCreatedPromise, roomJoinedPromise]);
    });
});
