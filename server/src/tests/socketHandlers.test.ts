import { Server } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { registerSocketEvents, resetLobby } from "../socketHandlers.js";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "../../../shared/types.js";
import { lobbyRooms } from "../socketHandlers.js";
// fancy method for tomorrow me
// function waitFor(socket: ClientSocket, event: keyof ServerToClientEvents) {
//   return new Promise((resolve) => {
//     socket.once(event, resolve);
//   });
// }

describe("registerSocketEvents", () => {
    let io: Server;
    const clientSockets: ClientSocket<
        ServerToClientEvents,
        ClientToServerEvents
    >[] = [];

    beforeAll(() => {
        return new Promise((resolve) => {
            const httpServer = createServer();
            io = new Server<ClientToServerEvents, ServerToClientEvents>(
                httpServer
            );
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
        resetLobby(io);
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
    test("join_room, room does not exist", () => {
        return new Promise<void>((resolve) => {
            clientSockets[0].on("error", ({ error }) => {
                expect(error.includes(`doesn't exist`)).toBe(true);
                resolve();
            });
            clientSockets[0].emit("join_room", {
                playerName: "testUser2",
                roomCode: "noice",
            });
        });
    });
    test("join_room, room full", () => {
        return new Promise<void>((resolve) => {
            let roomCode: string;
            clientSockets[0].on(
                "room_created",
                (payload) => (roomCode = payload.roomCode)
            );
            clientSockets[0].once("room_joined", () => {
                clientSockets[1].emit("join_room", {
                    playerName: "testUser2",
                    roomCode,
                });
            });
            clientSockets[1].once("room_joined", () => {
                clientSockets[2].emit("join_room", {
                    playerName: "testUser3",
                    roomCode,
                });
            });
            clientSockets[2].once("room_joined", () => {
                clientSockets[3].emit("join_room", {
                    playerName: "testUser4",
                    roomCode,
                });
            });
            clientSockets[3].once("room_joined", () => {
                clientSockets[4].emit("join_room", {
                    playerName: "testUser4",
                    roomCode,
                });
            });
            clientSockets[4].on("error", ({ error }) => {
                expect(error.includes(`is full`)).toBe(true);
                resolve();
            });

            clientSockets[0].emit("create_room", { playerName: "testUser1" });
        });
    });
    test("join_room, game in progress", () => {
        return new Promise<void>((resolve) => {
            lobbyRooms.set("ingame", {
                id: "ingame",
                status: "in_progress",
                members: [],
                gameState: undefined,
            });
            clientSockets[0].on("error", ({ error }) => {
                expect(error.includes("in progress")).toBe(true);
                resolve();
            });
            clientSockets[0].emit("join_room", {
                playerName: "Frank",
                roomCode: "ingame",
            });
        });
    });
    test("player_ready, data validation", () => {
        return new Promise<void>((resolve) => {
            let roomCode: string;
            const gameStartedPromises = clientSockets
                .filter((_, i) => i < 4)
                .map(
                    (socket) =>
                        new Promise((res) => {
                            socket.once(
                                "game_started",
                                ({ hand, dealerIndex, currentPlayerIndex }) => {
                                    expect(Array.isArray(hand)).toBe(true);
                                    expect(Number.isInteger(dealerIndex)).toBe(
                                        true
                                    );
                                    expect(currentPlayerIndex).toBe(
                                        dealerIndex
                                    );

                                    res(undefined);
                                }
                            );
                        })
                );
            clientSockets[0].on(
                "room_created",
                (payload) => (roomCode = payload.roomCode)
            );
            clientSockets[0].once("room_joined", () => {
                clientSockets[1].emit("join_room", {
                    playerName: "testUser2",
                    roomCode,
                });
            });
            clientSockets[1].once("room_joined", () => {
                clientSockets[2].emit("join_room", {
                    playerName: "testUser3",
                    roomCode,
                });
            });
            clientSockets[2].once("room_joined", () => {
                clientSockets[3].emit("join_room", {
                    playerName: "testUser4",
                    roomCode,
                });
            });
            clientSockets[3].once("room_joined", () => {
                clientSockets[0].emit("player_ready");
            });
            clientSockets[0].once("player_ready_update", () => {
                clientSockets[1].emit("player_ready");
            });
            clientSockets[1].once("player_ready_update", () => {
                clientSockets[2].emit("player_ready");
            });
            clientSockets[2].once("player_ready_update", () => {
                clientSockets[3].emit("player_ready");
            });

            clientSockets[0].emit("create_room", { playerName: "testUser1" });

            Promise.all(gameStartedPromises).finally(() => resolve());
        });
    });
});
