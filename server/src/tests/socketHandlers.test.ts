import { Server } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { registerSocketEvents } from "../socketHandlers.js";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "../../../shared/types.js";

describe("registerSocketEvents", () => {
    let io: Server;
    const clientSockets: ClientSocket<
        ServerToClientEvents,
        ClientToServerEvents
    >[] = [];

    beforeAll(() => {
        return new Promise((resolve) => {
            const httpServer = createServer();
            io = new Server(httpServer);
            httpServer.listen(() => {
                const port = (httpServer.address() as AddressInfo).port;
                for (let i = 0; i < 5; i++) {
                    const clientSocket = ioc(`http://localhost:${port}`);
                    clientSockets.push(clientSocket);
                }
                registerSocketEvents(io);
                Promise.all(
                    clientSockets.map(
                        (clientSocket) =>
                            new Promise((res) => {
                                clientSocket.on("connect", () =>
                                    res(undefined)
                                );
                            })
                    )
                ).then(() => resolve(undefined));
            });
        });
    });

    afterAll(() => {
        io.close();
        clientSockets.forEach((clientSocket) => {
            clientSocket.disconnect();
        });
    });

    afterEach(() => {
        clientSockets.forEach((clientSocket) => {
            clientSocket.removeAllListeners();
        });
    });

    test("create_room, happy path", () => {
        const roomCreatedPromise = new Promise<void>((resolve) => {
            clientSockets[0].on("room_created", ({ roomCode }) => {
                expect(typeof roomCode).toBe("string");
                expect(roomCode.length).toBe(5);
                resolve();
            });
        });

        const roomJoinedPromise = new Promise<void>((resolve) => {
            clientSockets[0].on("room_joined", ({ roomMembers }) => {
                expect(roomMembers.length).toBe(1);
                resolve();
            });
        });
        clientSockets[0].emit("create_room", { playerName: "testUser1" });
        return Promise.all([roomCreatedPromise, roomJoinedPromise]);
    });
    test("join_room, happy path", () => {
        return new Promise<void>((resolve) => {
            clientSockets[1].on("room_joined", ({ roomMembers }) => {
                expect(roomMembers.length).toBe(2);
                expect(
                    roomMembers.every(
                        ({ id }) =>
                            id === clientSockets[0].id ||
                            id === clientSockets[1].id
                    )
                ).toBe(true);
                resolve();
            });
            clientSockets[0].on("room_created", ({ roomCode }) => {
                clientSockets[1].emit("join_room", {
                    playerName: "testUser2",
                    roomCode,
                });
            });

            clientSockets[0].emit("create_room", { playerName: "testUser" });
        });
    });
    test("join_room, room does not exist", () => {});
    test("join_room, room full", () => {});
    test("join_room, game in progress", () => {});
});
