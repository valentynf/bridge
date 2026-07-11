import { Server } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { SocketHandler } from "../socketHandler.js";
import type {
    Card,
    ClientToServerEvents,
    ServerToClientEvents,
} from "../../../shared/types.js";
import { reverseDealCards, shuffleDeck } from "../functions/deck.js";
import { areSameCards } from "../functions/utility.js";
import { MAX_ROOM_SIZE, START_HAND_SIZE } from "../../../shared/consts.js";

describe("registerSocketEvents", () => {
    let io: Server;
    let socketHandler: SocketHandler;
    const clientSockets: ClientSocket<
        ServerToClientEvents,
        ClientToServerEvents
    >[] = [];
    const mathRandomSpy = vi.spyOn(Math, "random");
    let predictableDeck: Card[] | undefined = undefined;
    const predictableShuffleDeck = (unshuffledDeck: Card[]): Card[] => {
        if (predictableDeck) return predictableDeck;
        return shuffleDeck(unshuffledDeck);
    };

    beforeAll(() => {
        return new Promise((resolve) => {
            const httpServer = createServer();
            io = new Server<ClientToServerEvents, ServerToClientEvents>(
                httpServer
            );
            socketHandler = new SocketHandler(io, predictableShuffleDeck);
            httpServer.listen(() => {
                const port = (httpServer.address() as AddressInfo).port;
                for (let i = 0; i < 5; i++) {
                    const clientSocket = ioc(`http://localhost:${port}`);
                    clientSockets.push(clientSocket);
                }
                socketHandler.registerSocketEvents();
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
        mathRandomSpy.mockRestore();
        io.close();
        clientSockets.forEach((clientSocket) => {
            clientSocket.disconnect();
        });
    });

    afterEach(() => {
        clientSockets.forEach((clientSocket) => {
            clientSocket.removeAllListeners();
        });
        socketHandler.resetLobby();
    });

    describe("create_room", () => {
        test("Should create room", () => {
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
    });
    describe("join_room", () => {
        test("Should join room", () => {
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

                clientSockets[0].emit("create_room", {
                    playerName: "testUser",
                });
            });
        });
        test("Should receive error, non-existing room", () => {
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
        test("Should receive error, full room", () => {
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

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });
        });
        test("Should receive error, game in progress", () => {
            return new Promise<void>((resolve) => {
                socketHandler.setRoom("ingame", {
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
    });
    describe("player_ready", () => {
        test("Should generate new game state, fire game_started", () => {
            return new Promise<void>((resolve) => {
                let roomCode: string;
                const roundStartedPromises = clientSockets
                    .filter((_, i) => i < 4)
                    .map(
                        (socket) =>
                            new Promise((res) => {
                                socket.once(
                                    "round_started",
                                    ({
                                        hand,
                                        dealerIndex,
                                        currentPlayerIndex,
                                        players,
                                    }) => {
                                        expect(Array.isArray(hand)).toBe(true);
                                        expect(
                                            Number.isInteger(dealerIndex)
                                        ).toBe(true);
                                        expect(currentPlayerIndex).toBe(
                                            dealerIndex
                                        );
                                        expect(players.length).toBe(4);

                                        res(undefined);
                                    }
                                );
                            })
                    );
                const gameStartedPromise = new Promise<void>((res) => {
                    clientSockets[0].once("game_started", () => {
                        res(undefined);
                    });
                });
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

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });

                Promise.all([
                    ...roundStartedPromises,
                    gameStartedPromise,
                ]).finally(() => resolve());
            });
        });
    });
    describe("play_cards", () => {
        let dealerIndex: number;
        let currentPlayerIndex: number;

        afterEach(() => {
            predictableDeck = undefined;
        });

        describe("Dealer turn", () => {
            beforeEach(
                () =>
                    new Promise<void>((resolve) => {
                        let roomCode: string;
                        clientSockets[0].once(
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
                            predictableDeck = reverseDealCards([
                                [
                                    { rank: "6", suit: "diamonds" },
                                    { rank: "Q", suit: "clubs" },
                                    { rank: "10", suit: "clubs" },
                                    { rank: "10", suit: "hearts" },
                                    { rank: "10", suit: "clubs" },
                                ],
                                [],
                                [],
                                [],
                            ]);
                            mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                            clientSockets[0].emit("player_ready");
                            clientSockets[1].emit("player_ready");
                            clientSockets[2].emit("player_ready");
                            clientSockets[3].emit("player_ready");
                        });
                        clientSockets[0].once("round_started", (payload) => {
                            dealerIndex = payload.dealerIndex;
                            resolve();
                        });

                        clientSockets[0].emit("create_room", {
                            playerName: "testUser1",
                        });
                    })
            );

            test("Should advance turn when dealer plays no cards", () => {
                const turnStartedPromise = new Promise((res) => {
                    clientSockets[0].on(
                        "turn_started",
                        ({ currentPlayerIndex }) => {
                            expect(currentPlayerIndex).toBe(
                                (dealerIndex + 1) % 4
                            );
                            res(undefined);
                        }
                    );
                });

                clientSockets[dealerIndex].emit("play_cards", {
                    cardsToPlay: [],
                });

                return turnStartedPromise;
            });
            test("Should advance turn when dealer plays same rank card", () => {
                const playedCard: Card = { rank: "10", suit: "hearts" };
                const turnStartedPromise = new Promise((res) => {
                    clientSockets[2].on(
                        "turn_started",
                        ({ currentPlayerIndex }) => {
                            expect(currentPlayerIndex).toBe(
                                (dealerIndex + 1) % 4
                            );
                            res(undefined);
                        }
                    );
                });

                const cardsPlayedPromise = new Promise((res) => {
                    clientSockets[1].on(
                        "cards_played",
                        ({ cardsPlayed, activePileTopCard }) => {
                            expect(cardsPlayed[0]).toEqual(playedCard);
                            expect(activePileTopCard).toEqual(playedCard);
                            res(undefined);
                        }
                    );
                });

                const handUpdatedPromise = new Promise((res) => {
                    clientSockets[0].on("hand_update", ({ updatedHand }) => {
                        const isPlayedCardOnHand: boolean = updatedHand.some(
                            (card) => areSameCards(card, playedCard)
                        );
                        expect(isPlayedCardOnHand).toBe(false);
                        res(undefined);
                    });
                });

                const noHandUpdatePromise = new Promise((res) => {
                    clientSockets[1].on("hand_update", () => {
                        expect.fail();
                    });
                    setTimeout(() => {
                        res(undefined);
                    }, 10);
                });

                clientSockets[dealerIndex].emit("play_cards", {
                    cardsToPlay: [playedCard],
                });

                return Promise.all([
                    turnStartedPromise,
                    cardsPlayedPromise,
                    handUpdatedPromise,
                    noHandUpdatePromise,
                ]);
            });
            test("Should advance turn when dealer plays same rank cards", () => {
                const playedCards: Card[] = [
                    { rank: "10", suit: "clubs" },
                    { rank: "10", suit: "hearts" },
                ];
                const cardsPlayedPromise = new Promise((res) => {
                    clientSockets[1].on(
                        "cards_played",
                        ({ activePileTopCard }) => {
                            expect(activePileTopCard).toEqual(playedCards[0]);
                            res(undefined);
                        }
                    );
                });

                clientSockets[dealerIndex].emit("play_cards", {
                    cardsToPlay: playedCards,
                });

                return cardsPlayedPromise;
            });
        });

        describe("Dealer turn with effects", () => {
            let dealerIndex: number = 0;

            afterEach(() => {
                predictableDeck = undefined;
            });

            test("Should skip next player turn, Ace", async () => {
                await new Promise<void>((resolve) => {
                    let roomCode: string;
                    clientSockets[0].once(
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
                        predictableDeck = reverseDealCards([
                            [
                                { rank: "6", suit: "diamonds" },
                                { rank: "Q", suit: "clubs" },
                                { rank: "10", suit: "clubs" },
                                { rank: "10", suit: "hearts" },
                                { rank: "A", suit: "clubs" },
                            ],
                            [],
                            [],
                            [],
                        ]);
                        mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                        clientSockets[0].emit("player_ready");
                        clientSockets[1].emit("player_ready");
                        clientSockets[2].emit("player_ready");
                        clientSockets[3].emit("player_ready");
                    });
                    clientSockets[0].once("round_started", (payload) => {
                        dealerIndex = payload.dealerIndex;
                        resolve();
                    });

                    clientSockets[0].emit("create_room", {
                        playerName: "testUser1",
                    });
                });

                const turnStartedPromise = new Promise((res) => {
                    clientSockets[0].on(
                        "turn_started",
                        ({ currentPlayerIndex }) => {
                            expect(currentPlayerIndex).toBe(
                                (dealerIndex + 2) % MAX_ROOM_SIZE
                            );
                            res(undefined);
                        }
                    );
                });

                clientSockets[dealerIndex].emit("play_cards", {
                    cardsToPlay: [],
                });

                return turnStartedPromise;
            });
            test("Should skip next player turn, draw two cards, 8", async () => {
                await new Promise<void>((resolve) => {
                    let roomCode: string;
                    clientSockets[0].once(
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
                        predictableDeck = reverseDealCards([
                            [
                                { rank: "8", suit: "diamonds" },
                                { rank: "Q", suit: "clubs" },
                                { rank: "10", suit: "clubs" },
                                { rank: "10", suit: "hearts" },
                                { rank: "8", suit: "clubs" },
                            ],
                            [],
                            [],
                            [],
                        ]);
                        mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                        clientSockets[0].emit("player_ready");
                        clientSockets[1].emit("player_ready");
                        clientSockets[2].emit("player_ready");
                        clientSockets[3].emit("player_ready");
                    });
                    clientSockets[0].once("round_started", (payload) => {
                        dealerIndex = payload.dealerIndex;
                        resolve();
                    });

                    clientSockets[0].emit("create_room", {
                        playerName: "testUser1",
                    });
                });

                const turnStartedPromise = new Promise((res) => {
                    clientSockets[0].on(
                        "turn_started",
                        ({ currentPlayerIndex }) => {
                            expect(currentPlayerIndex).toBe(
                                (dealerIndex + 2) % MAX_ROOM_SIZE
                            );
                            res(undefined);
                        }
                    );
                });

                const twoCardsReceivedPromise = new Promise((res) => {
                    clientSockets[(dealerIndex + 1) % MAX_ROOM_SIZE].on(
                        "hand_update",
                        ({ updatedHand }) => {
                            expect(updatedHand.length).toBe(
                                START_HAND_SIZE + 2
                            );
                            res(undefined);
                        }
                    );
                });

                clientSockets[dealerIndex].emit("play_cards", {
                    cardsToPlay: [],
                });

                return Promise.all([
                    turnStartedPromise,
                    twoCardsReceivedPromise,
                ]);
            });
            test("Should start next turn draw two cards, 7s", async () => {
                await new Promise<void>((resolve) => {
                    let roomCode: string;
                    clientSockets[0].once(
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
                        predictableDeck = reverseDealCards([
                            [
                                { rank: "7", suit: "diamonds" },
                                { rank: "Q", suit: "clubs" },
                                { rank: "10", suit: "clubs" },
                                { rank: "10", suit: "hearts" },
                                { rank: "7", suit: "clubs" },
                            ],
                            [],
                            [],
                            [],
                        ]);
                        mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                        clientSockets[0].emit("player_ready");
                        clientSockets[1].emit("player_ready");
                        clientSockets[2].emit("player_ready");
                        clientSockets[3].emit("player_ready");
                    });
                    clientSockets[0].once("round_started", (payload) => {
                        dealerIndex = payload.dealerIndex;
                        resolve();
                    });

                    clientSockets[0].emit("create_room", {
                        playerName: "testUser1",
                    });
                });

                const turnStartedPromise = new Promise((res) => {
                    clientSockets[0].on(
                        "turn_started",
                        ({ currentPlayerIndex }) => {
                            expect(currentPlayerIndex).toBe(
                                (dealerIndex + 1) % MAX_ROOM_SIZE
                            );
                            res(undefined);
                        }
                    );
                });

                const twoCardsReceivedPromise = new Promise((res) => {
                    clientSockets[(dealerIndex + 1) % MAX_ROOM_SIZE].on(
                        "hand_update",
                        ({ updatedHand }) => {
                            expect(updatedHand.length).toBe(
                                START_HAND_SIZE + 2
                            );
                            res(undefined);
                        }
                    );
                });

                clientSockets[dealerIndex].emit("play_cards", {
                    cardsToPlay: [{ rank: "7", suit: "diamonds" }],
                });

                return Promise.all([
                    turnStartedPromise,
                    twoCardsReceivedPromise,
                ]);
            });
        });

        describe("Usual turn", () => {
            beforeEach(
                () =>
                    new Promise<void>((resolve) => {
                        let roomCode: string;
                        clientSockets[0].once(
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
                            predictableDeck = reverseDealCards([
                                [
                                    { rank: "6", suit: "diamonds" },
                                    { rank: "Q", suit: "clubs" },
                                    { rank: "10", suit: "spades" },
                                    { rank: "10", suit: "hearts" },
                                    { rank: "10", suit: "clubs" },
                                ],
                                [
                                    { rank: "K", suit: "clubs" },
                                    { rank: "8", suit: "clubs" },
                                    { rank: "8", suit: "diamonds" },
                                    { rank: "7", suit: "clubs" },
                                    { rank: "A", suit: "clubs" },
                                ],
                                [],
                                [],
                            ]);
                            mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                            clientSockets[0].emit("player_ready");
                            clientSockets[1].emit("player_ready");
                            clientSockets[2].emit("player_ready");
                            clientSockets[3].emit("player_ready");
                        });
                        clientSockets[0].once("round_started", (payload) => {
                            dealerIndex = payload.dealerIndex;
                            clientSockets[dealerIndex].emit("play_cards", {
                                cardsToPlay: [],
                            });
                            clientSockets[2].on(
                                "turn_started",
                                ({ currentPlayerIndex: newIndex }) => {
                                    currentPlayerIndex = newIndex;
                                    resolve();
                                }
                            );
                        });

                        clientSockets[0].emit("create_room", {
                            playerName: "testUser1",
                        });
                    })
            );

            test("Should advance turn after non-special proper card was played", async () => {
                const cardsPlayedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("cards_played", () => {
                        res(undefined);
                    });
                });

                const handUpdatedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("hand_update", () => {
                        res(undefined);
                    });
                });

                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [{ rank: "K", suit: "clubs" }],
                });

                await Promise.all([cardsPlayedPromise, handUpdatedPromise]);

                clientSockets[currentPlayerIndex].emit("end_turn");

                const turnStartedPromise = new Promise((res) => {
                    clientSockets[0].on("turn_started", () => {
                        res(undefined);
                    });
                });

                return turnStartedPromise;
            });

            test("Should peform special effects, two 8s", async () => {
                const cardsPlayedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("cards_played", () => {
                        res(undefined);
                    });
                });

                const handUpdatedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("hand_update", () => {
                        res(undefined);
                    });
                });

                const fourCardsReceivedPromise = new Promise((res) => {
                    clientSockets[(currentPlayerIndex + 1) % MAX_ROOM_SIZE].on(
                        "hand_update",
                        ({ updatedHand }) => {
                            expect(updatedHand.length).toBe(
                                START_HAND_SIZE + 4
                            );
                            res(undefined);
                        }
                    );
                });

                const effectsAppliedReceivedPromise = new Promise((res) => {
                    clientSockets[3].on(
                        "effects_applied",
                        ({ specialEffects, affectedPlayerIndex }) => {
                            expect(specialEffects).toEqual([
                                "TAKE_CARD",
                                "TAKE_CARD",
                                "TAKE_CARD",
                                "TAKE_CARD",
                                "SKIP_TURN",
                            ]);
                            expect(affectedPlayerIndex).toBe(
                                (currentPlayerIndex + 1) % MAX_ROOM_SIZE
                            );
                            res(undefined);
                        }
                    );
                });

                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [
                        { rank: "8", suit: "diamonds" },
                        { rank: "8", suit: "clubs" },
                    ],
                });

                await Promise.all([
                    cardsPlayedPromise,
                    handUpdatedPromise,
                    fourCardsReceivedPromise,
                    effectsAppliedReceivedPromise,
                ]);

                clientSockets[currentPlayerIndex].emit("end_turn");

                const turnStartedPromise = new Promise((res) => {
                    clientSockets[0].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            expect(newIndex).toBe(
                                (currentPlayerIndex + 2) % MAX_ROOM_SIZE
                            );
                            res(undefined);
                        }
                    );
                });

                return turnStartedPromise;
            });

            test("Should peform special effects, 7", async () => {
                const cardsPlayedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("cards_played", () => {
                        res(undefined);
                    });
                });

                const handUpdatedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("hand_update", () => {
                        res(undefined);
                    });
                });

                const oneCardReceivedPromise = new Promise((res) => {
                    clientSockets[(currentPlayerIndex + 1) % MAX_ROOM_SIZE].on(
                        "hand_update",
                        ({ updatedHand }) => {
                            expect(updatedHand.length).toBe(
                                START_HAND_SIZE + 1
                            );
                            res(undefined);
                        }
                    );
                });

                const effectsAppliedReceivedPromise = new Promise((res) => {
                    clientSockets[3].on(
                        "effects_applied",
                        ({ specialEffects, affectedPlayerIndex }) => {
                            expect(specialEffects).toEqual(["TAKE_CARD"]);
                            expect(affectedPlayerIndex).toBe(
                                (currentPlayerIndex + 1) % MAX_ROOM_SIZE
                            );
                            res(undefined);
                        }
                    );
                });

                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [{ rank: "7", suit: "clubs" }],
                });

                await Promise.all([
                    cardsPlayedPromise,
                    handUpdatedPromise,
                    oneCardReceivedPromise,
                    effectsAppliedReceivedPromise,
                ]);

                clientSockets[currentPlayerIndex].emit("end_turn");

                const turnStartedPromise = new Promise((res) => {
                    clientSockets[0].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            expect(newIndex).toBe(
                                (currentPlayerIndex + 1) % MAX_ROOM_SIZE
                            );
                            res(undefined);
                        }
                    );
                });

                return turnStartedPromise;
            });

            test("Should peform special effects, Ace", async () => {
                const cardsPlayedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("cards_played", () => {
                        res(undefined);
                    });
                });

                const handUpdatedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("hand_update", () => {
                        res(undefined);
                    });
                });

                const handUpdateNotReceived = new Promise((res) => {
                    clientSockets[(currentPlayerIndex + 1) % MAX_ROOM_SIZE].on(
                        "hand_update",
                        () => {
                            expect.fail();
                        }
                    );
                    setTimeout(() => {
                        res(undefined);
                    }, 10);
                });

                const effectsAppliedReceivedPromise = new Promise((res) => {
                    clientSockets[3].on(
                        "effects_applied",
                        ({ specialEffects, affectedPlayerIndex }) => {
                            expect(specialEffects).toEqual(["SKIP_TURN"]);
                            expect(affectedPlayerIndex).toBe(
                                (currentPlayerIndex + 1) % MAX_ROOM_SIZE
                            );
                            res(undefined);
                        }
                    );
                });

                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [{ rank: "A", suit: "clubs" }],
                });

                await Promise.all([
                    cardsPlayedPromise,
                    handUpdatedPromise,
                    handUpdateNotReceived,
                    effectsAppliedReceivedPromise,
                ]);

                clientSockets[currentPlayerIndex].emit("end_turn");

                const turnStartedPromise = new Promise((res) => {
                    clientSockets[0].on(
                        "turn_started",
                        ({ currentPlayerIndex: newPlayerIndex }) => {
                            expect(newPlayerIndex).toBe(
                                (currentPlayerIndex + 2) % MAX_ROOM_SIZE
                            );
                            res(undefined);
                        }
                    );
                });

                return turnStartedPromise;
            });
        });

        describe("Special usual turns", () => {
            beforeEach(
                () =>
                    new Promise<void>((resolve) => {
                        let roomCode: string;
                        clientSockets[0].once(
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
                            predictableDeck = reverseDealCards([
                                [
                                    { rank: "6", suit: "diamonds" },
                                    { rank: "Q", suit: "clubs" },
                                    { rank: "9", suit: "spades" },
                                    { rank: "9", suit: "hearts" },
                                    { rank: "10", suit: "clubs" },
                                ],
                                [
                                    { rank: "J", suit: "hearts" },
                                    { rank: "6", suit: "clubs" },
                                    { rank: "10", suit: "spades" },
                                    { rank: "10", suit: "hearts" },
                                    { rank: "10", suit: "diamonds" },
                                ],
                                [
                                    { rank: "Q", suit: "spades" },
                                    { rank: "Q", suit: "hearts" },
                                    { rank: "8", suit: "clubs" },
                                    { rank: "J", suit: "clubs" },
                                    { rank: "J", suit: "diamonds" },
                                ],
                                [
                                    { rank: "A", suit: "clubs" },
                                    { rank: "A", suit: "hearts" },
                                    { rank: "A", suit: "diamonds" },
                                    { rank: "A", suit: "spades" },
                                    { rank: "K", suit: "spades" },
                                ],
                            ]);
                            mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                            clientSockets[0].emit("player_ready");
                            clientSockets[1].emit("player_ready");
                            clientSockets[2].emit("player_ready");
                            clientSockets[3].emit("player_ready");
                        });
                        clientSockets[0].once("round_started", (payload) => {
                            dealerIndex = payload.dealerIndex;
                            clientSockets[dealerIndex].emit("play_cards", {
                                cardsToPlay: [],
                            });
                            clientSockets[2].on(
                                "turn_started",
                                ({ currentPlayerIndex: newIndex }) => {
                                    currentPlayerIndex = newIndex;
                                    resolve();
                                }
                            );
                        });

                        clientSockets[0].emit("create_room", {
                            playerName: "testUser1",
                        });
                    })
            );

            test("Should advance turn, trigger Jack suit declaring", async () => {
                const cardsPlayedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("cards_played", () => {
                        res(undefined);
                    });
                });

                const handUpdatedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("hand_update", () => {
                        res(undefined);
                    });
                });

                const setJackSuitReceivedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on(
                        "set_jack_suit",
                        () => {
                            res(undefined);
                        }
                    );
                });

                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [{ rank: "J", suit: "hearts" }],
                });

                await Promise.all([
                    cardsPlayedPromise,
                    handUpdatedPromise,
                    setJackSuitReceivedPromise,
                ]);

                clientSockets[currentPlayerIndex].emit("declare_suit", {
                    suit: "spades",
                });

                clientSockets[currentPlayerIndex].emit("end_turn");

                const turnStartedPromise = new Promise((res) => {
                    clientSockets[0].on("turn_started", () => {
                        res(undefined);
                    });
                });

                return turnStartedPromise;
            });
            test("Should reject end_turn when suit has not been declared", async () => {
                const cardsPlayedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("cards_played", () => {
                        res(undefined);
                    });
                });

                const handUpdatedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("hand_update", () => {
                        res(undefined);
                    });
                });

                const setJackSuitReceivedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on(
                        "set_jack_suit",
                        () => {
                            res(undefined);
                        }
                    );
                });

                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [{ rank: "J", suit: "hearts" }],
                });

                await Promise.all([
                    cardsPlayedPromise,
                    handUpdatedPromise,
                    setJackSuitReceivedPromise,
                ]);

                clientSockets[currentPlayerIndex].emit("end_turn");

                const errorReceivedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("error", () => {
                        res(undefined);
                    });
                });

                return errorReceivedPromise;
            });
            test("Should end round after bridge declaring", async () => {
                const cardsPlayedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("cards_played", () => {
                        res(undefined);
                    });
                });

                const handUpdatedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("hand_update", () => {
                        res(undefined);
                    });
                });

                const canBridgePromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("can_bridge", () => {
                        res(undefined);
                    });
                });

                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [
                        { rank: "10", suit: "spades" },
                        { rank: "10", suit: "hearts" },
                        { rank: "10", suit: "diamonds" },
                    ],
                });

                await Promise.all([
                    cardsPlayedPromise,
                    handUpdatedPromise,
                    canBridgePromise,
                ]);

                clientSockets[currentPlayerIndex].emit("declare_bridge");

                const roundEndedPromise = new Promise((res) => {
                    clientSockets[0].on(
                        "round_ended",
                        ({
                            scores,
                            winnerIndex,
                            eliminatedIndexes,
                            reshuffleMultiplier,
                            nextDealerIndex,
                        }) => {
                            expect(scores).toEqual([10, 20, 60, 70]);
                            expect(eliminatedIndexes).toEqual([]);
                            expect(reshuffleMultiplier).toBe(0);
                            expect(nextDealerIndex).toBe(3);
                            expect(winnerIndex).toBe(currentPlayerIndex);
                            res(undefined);
                        }
                    );
                });

                return roundEndedPromise;
            });
            test("Should not successfuly declare bridge - illegal play", () => {
                const bridgeDeclaredNotReceivedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on(
                        "bridge_declared",
                        () => {
                            expect.fail();
                        }
                    );
                    setTimeout(() => {
                        res(undefined);
                    }, 10);
                });

                clientSockets[currentPlayerIndex].emit("declare_bridge");

                return bridgeDeclaredNotReceivedPromise;
            });
        });

        describe("6 case, cover on hands", () => {
            beforeEach(
                () =>
                    new Promise<void>((resolve) => {
                        let roomCode: string;
                        clientSockets[0].once(
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
                            predictableDeck = reverseDealCards([
                                [
                                    { rank: "6", suit: "diamonds" },
                                    { rank: "Q", suit: "clubs" },
                                    { rank: "10", suit: "spades" },
                                    { rank: "10", suit: "clubs" },
                                    { rank: "10", suit: "hearts" },
                                ],
                                [
                                    { rank: "K", suit: "hearts" },
                                    { rank: "8", suit: "diamonds" },
                                    { rank: "7", suit: "spades" },
                                    { rank: "6", suit: "hearts" },
                                    { rank: "A", suit: "spades" },
                                ],
                                [],
                                [],
                            ]);
                            mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                            clientSockets[0].emit("player_ready");
                            clientSockets[1].emit("player_ready");
                            clientSockets[2].emit("player_ready");
                            clientSockets[3].emit("player_ready");
                        });
                        clientSockets[0].once("round_started", (payload) => {
                            dealerIndex = payload.dealerIndex;
                            clientSockets[dealerIndex].emit("play_cards", {
                                cardsToPlay: [],
                            });
                            clientSockets[2].on(
                                "turn_started",
                                ({ currentPlayerIndex: newIndex }) => {
                                    currentPlayerIndex = newIndex;
                                    resolve();
                                }
                            );
                        });

                        clientSockets[0].emit("create_room", {
                            playerName: "testUser1",
                        });
                    })
            );

            test("Should cover six right away", async () => {
                const cardsPlayedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("cards_played", () => {
                        res(undefined);
                    });
                });
                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [
                        { rank: "K", suit: "hearts" },
                        { rank: "6", suit: "hearts" },
                    ],
                });
                return cardsPlayedPromise;
            });
            test("Should emit error if six played without existing cover", async () => {
                const errorReceivedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].on("error", () => {
                        res(undefined);
                    });
                });
                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [{ rank: "6", suit: "hearts" }],
                });
                return errorReceivedPromise;
            });
        });

        test("Should cover six with a drawn card", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards(
                        [
                            [
                                { rank: "6", suit: "diamonds" },
                                { rank: "Q", suit: "clubs" },
                                { rank: "10", suit: "spades" },
                                { rank: "10", suit: "clubs" },
                                { rank: "10", suit: "hearts" },
                            ],
                            [
                                { rank: "K", suit: "spades" },
                                { rank: "8", suit: "diamonds" },
                                { rank: "7", suit: "spades" },
                                { rank: "6", suit: "hearts" },
                                { rank: "A", suit: "spades" },
                            ],
                            [],
                            [],
                        ],
                        [{ rank: "7", suit: "hearts" }]
                    );
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    dealerIndex = payload.dealerIndex;
                    clientSockets[dealerIndex].emit("play_cards", {
                        cardsToPlay: [],
                    });
                    clientSockets[2].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            currentPlayerIndex = newIndex;
                            resolve();
                        }
                    );
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const sixPlayedPromise = new Promise<void>((res) => {
                clientSockets[currentPlayerIndex].once("cards_played", () => {
                    clientSockets[currentPlayerIndex].on(
                        "cards_played",
                        ({ activePileTopCard, handCount }) => {
                            expect(activePileTopCard).toEqual({
                                rank: "7",
                                suit: "hearts",
                            });
                            expect(handCount).toBe(4);
                            clientSockets[currentPlayerIndex].emit("end_turn");
                        }
                    );

                    clientSockets[currentPlayerIndex].on("card_drawn", () => {
                        clientSockets[currentPlayerIndex].emit("play_cards", {
                            cardsToPlay: [{ rank: "7", suit: "hearts" }],
                        });
                    });

                    clientSockets[currentPlayerIndex].on("turn_started", () => {
                        res();
                    });

                    clientSockets[currentPlayerIndex].on(
                        "effects_applied",
                        ({ affectedPlayerIndex }) => {
                            expect(affectedPlayerIndex).toBe(
                                (currentPlayerIndex + 1) % MAX_ROOM_SIZE
                            );
                        }
                    );

                    clientSockets[currentPlayerIndex].emit("draw_card");
                });
            });

            clientSockets[currentPlayerIndex].emit("play_cards", {
                cardsToPlay: [{ rank: "6", suit: "hearts" }],
            });

            return sixPlayedPromise;
        });

        describe("6 case, cover in pile after another 6", () => {
            beforeEach(
                () =>
                    new Promise<void>((resolve) => {
                        let roomCode: string;
                        clientSockets[0].once(
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
                            predictableDeck = reverseDealCards(
                                [
                                    [
                                        { rank: "6", suit: "diamonds" },
                                        { rank: "Q", suit: "clubs" },
                                        { rank: "10", suit: "spades" },
                                        { rank: "10", suit: "clubs" },
                                        { rank: "10", suit: "hearts" },
                                    ],
                                    [
                                        { rank: "K", suit: "spades" },
                                        { rank: "8", suit: "diamonds" },
                                        { rank: "7", suit: "spades" },
                                        { rank: "6", suit: "hearts" },
                                        { rank: "A", suit: "spades" },
                                    ],
                                    [],
                                    [],
                                ],
                                [
                                    { rank: "6", suit: "clubs" },
                                    { rank: "9", suit: "clubs" },
                                ]
                            );
                            mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                            clientSockets[0].emit("player_ready");
                            clientSockets[1].emit("player_ready");
                            clientSockets[2].emit("player_ready");
                            clientSockets[3].emit("player_ready");
                        });
                        clientSockets[0].once("round_started", (payload) => {
                            dealerIndex = payload.dealerIndex;
                            clientSockets[dealerIndex].emit("play_cards", {
                                cardsToPlay: [],
                            });
                            clientSockets[2].on(
                                "turn_started",
                                ({ currentPlayerIndex: newIndex }) => {
                                    currentPlayerIndex = newIndex;

                                    clientSockets[currentPlayerIndex].once(
                                        "cards_played",
                                        () => {
                                            resolve();
                                        }
                                    );

                                    clientSockets[currentPlayerIndex].emit(
                                        "play_cards",
                                        {
                                            cardsToPlay: [
                                                { rank: "6", suit: "hearts" },
                                            ],
                                        }
                                    );
                                }
                            );
                        });

                        clientSockets[0].emit("create_room", {
                            playerName: "testUser1",
                        });
                    })
            );
            test("Should not end turn without covering six", () => {
                const errorReceivedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].once("error", () => {
                        clearTimeout(timeout);
                        res(undefined);
                    });
                    const timeout = setTimeout(() => {
                        expect.fail();
                    }, 10);
                });

                clientSockets[currentPlayerIndex].emit("end_turn");

                return errorReceivedPromise;
            });
            test("Should not draw card again if can play from hand", () => {
                const errorReceivedPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].once("card_drawn", () => {
                        clientSockets[currentPlayerIndex].once("error", () => {
                            clearTimeout(timeout);
                            res(undefined);
                        });

                        clientSockets[currentPlayerIndex].emit("draw_card");

                        const timeout = setTimeout(() => {
                            expect.fail();
                        }, 10);
                    });
                });

                clientSockets[currentPlayerIndex].emit("draw_card");

                return errorReceivedPromise;
            });
            test("Should play another six (drawn) and cover with 9 (drawn)", () => {
                const sixCoveredPromise = new Promise((res) => {
                    clientSockets[currentPlayerIndex].once("card_drawn", () => {
                        clientSockets[currentPlayerIndex].once(
                            "cards_played",
                            () => {
                                clientSockets[currentPlayerIndex].once(
                                    "card_drawn",
                                    () => {
                                        clientSockets[currentPlayerIndex].once(
                                            "cards_played",
                                            () => {
                                                res(undefined);
                                            }
                                        );

                                        clientSockets[currentPlayerIndex].emit(
                                            "play_cards",
                                            {
                                                cardsToPlay: [
                                                    {
                                                        rank: "9",
                                                        suit: "clubs",
                                                    },
                                                ],
                                            }
                                        );
                                    }
                                );

                                clientSockets[currentPlayerIndex].emit(
                                    "draw_card"
                                );
                            }
                        );

                        clientSockets[currentPlayerIndex].emit("play_cards", {
                            cardsToPlay: [{ rank: "6", suit: "clubs" }],
                        });
                    });
                });

                clientSockets[currentPlayerIndex].emit("draw_card");

                return sixCoveredPromise;
            });
        });

        test("Dealer turn: Should cover six with a card from hand", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards([
                        [
                            { rank: "6", suit: "diamonds" },
                            { rank: "Q", suit: "hearts" },
                            { rank: "10", suit: "spades" },
                            { rank: "10", suit: "clubs" },
                            { rank: "6", suit: "hearts" },
                        ],
                        [],
                        [],
                        [],
                    ]);
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    dealerIndex = payload.dealerIndex;
                    resolve();
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const sixCoveredPromise = new Promise<void>((res) => {
                clientSockets[dealerIndex].once(
                    "cards_played",
                    ({ activePileTopCard, handCount }) => {
                        expect(activePileTopCard).toEqual({
                            rank: "Q",
                            suit: "hearts",
                        });
                        expect(handCount).toBe(3);
                        res();
                    }
                );
            });

            clientSockets[dealerIndex].emit("play_cards", {
                cardsToPlay: [{ rank: "Q", suit: "hearts" }],
            });

            return sixCoveredPromise;
        });

        test("Dealer turn: Should cover six with a drawn card", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards(
                        [
                            [
                                { rank: "7", suit: "diamonds" },
                                { rank: "Q", suit: "spades" },
                                { rank: "10", suit: "spades" },
                                { rank: "10", suit: "clubs" },
                                { rank: "6", suit: "hearts" },
                            ],
                            [],
                            [],
                            [],
                        ],
                        [{ rank: "7", suit: "hearts" }]
                    );
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    dealerIndex = payload.dealerIndex;
                    resolve();
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const sixCoveredPromise = new Promise<void>((res) => {
                clientSockets[dealerIndex].once("card_drawn", () => {
                    clientSockets[dealerIndex].once(
                        "cards_played",
                        ({ activePileTopCard, handCount }) => {
                            expect(activePileTopCard).toEqual({
                                rank: "7",
                                suit: "hearts",
                            });
                            expect(handCount).toBe(4);
                        }
                    );

                    clientSockets[dealerIndex].on(
                        "effects_applied",
                        ({ affectedPlayerIndex }) => {
                            expect(affectedPlayerIndex).toBe(
                                (dealerIndex + 1) % MAX_ROOM_SIZE
                            );
                            res();
                        }
                    );

                    clientSockets[dealerIndex].emit("play_cards", {
                        cardsToPlay: [{ rank: "7", suit: "hearts" }],
                    });
                });
            });

            clientSockets[dealerIndex].emit("draw_card");

            return sixCoveredPromise;
        });

        test.skip("Should end round", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards([
                        [
                            { rank: "7", suit: "diamonds" },
                            { rank: "Q", suit: "spades" },
                            { rank: "10", suit: "spades" },
                            { rank: "10", suit: "clubs" },
                            { rank: "9", suit: "diamonds" },
                        ],
                        [],
                        [],
                        [],
                    ]);
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    const currentRoom = socketHandler.getRoom(roomCode);
                    if (currentRoom && currentRoom.gameState) {
                        currentRoom.gameState.players[1].hand = [
                            { rank: "10", suit: "diamonds" },
                        ];
                    }
                    dealerIndex = payload.dealerIndex;
                    clientSockets[dealerIndex].emit("play_cards", {
                        cardsToPlay: [],
                    });
                    clientSockets[2].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            currentPlayerIndex = newIndex;
                            resolve();
                        }
                    );
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const roundEndedPromise = new Promise((res) => {
                clientSockets[3].once("round_ended", ({ winnerIndex }) => {
                    expect(winnerIndex).toBe(currentPlayerIndex);
                    res(undefined);
                });
            });

            clientSockets[currentPlayerIndex].emit("play_cards", {
                cardsToPlay: [{ rank: "10", suit: "diamonds" }],
            });

            return roundEndedPromise;
        });

        test.skip("Should not be able to end round with a 6", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards([
                        [
                            { rank: "7", suit: "diamonds" },
                            { rank: "Q", suit: "spades" },
                            { rank: "10", suit: "spades" },
                            { rank: "10", suit: "clubs" },
                            { rank: "9", suit: "diamonds" },
                        ],
                        [{ rank: "6", suit: "diamonds" }],
                        [],
                        [],
                    ]);
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    const currentRoom = socketHandler.getRoom(roomCode);
                    if (currentRoom && currentRoom.gameState) {
                        currentRoom.gameState.players[1].hand = [
                            { rank: "6", suit: "diamonds" },
                        ];
                    }
                    dealerIndex = payload.dealerIndex;
                    clientSockets[dealerIndex].emit("play_cards", {
                        cardsToPlay: [],
                    });
                    clientSockets[2].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            currentPlayerIndex = newIndex;
                            resolve();
                        }
                    );
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const roundEndedNotReceivedPromise = new Promise((res) => {
                clientSockets[3].once("round_ended", () => {
                    expect.fail();
                });
                setTimeout(() => {
                    res(undefined);
                }, 10);
            });

            clientSockets[currentPlayerIndex].emit("play_cards", {
                cardsToPlay: [{ rank: "6", suit: "diamonds" }],
            });

            return roundEndedNotReceivedPromise;
        });

        test.skip("Should end round with Jack + double effect", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards([
                        [
                            { rank: "7", suit: "diamonds" },
                            { rank: "Q", suit: "spades" },
                            { rank: "10", suit: "spades" },
                            { rank: "10", suit: "clubs" },
                            { rank: "9", suit: "diamonds" },
                        ],
                        [{ rank: "J", suit: "diamonds" }],
                        [],
                        [],
                    ]);
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    const currentRoom = socketHandler.getRoom(roomCode);
                    if (currentRoom && currentRoom.gameState) {
                        currentRoom.gameState.players[1].hand = [
                            { rank: "J", suit: "diamonds" },
                        ];
                    }
                    dealerIndex = payload.dealerIndex;
                    clientSockets[dealerIndex].emit("play_cards", {
                        cardsToPlay: [],
                    });
                    clientSockets[2].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            currentPlayerIndex = newIndex;
                            resolve();
                        }
                    );
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const roundEndedPromise = new Promise((res) => {
                clientSockets[3].once("round_ended", ({ scores }) => {
                    expect(scores[dealerIndex]).toBe(60);
                    res(undefined);
                });
            });

            const chooseJackBonusReceivedPromise = new Promise((res) => {
                clientSockets[currentPlayerIndex].once(
                    "choose_jack_bonus",
                    ({ jackCount }) => {
                        expect(jackCount).toBe(1);
                        clientSockets[currentPlayerIndex].emit(
                            "declare_jack_bonus",
                            { option: "DOUBLE_ALL" }
                        );
                        res(undefined);
                    }
                );
            });

            clientSockets[currentPlayerIndex].emit("play_cards", {
                cardsToPlay: [{ rank: "J", suit: "diamonds" }],
            });

            return Promise.all([
                roundEndedPromise,
                chooseJackBonusReceivedPromise,
            ]);
        });

        test.skip("Should end round with two Jacks + minus20 effect + multiplier", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards([
                        [
                            { rank: "7", suit: "diamonds" },
                            { rank: "Q", suit: "spades" },
                            { rank: "10", suit: "spades" },
                            { rank: "10", suit: "clubs" },
                            { rank: "9", suit: "diamonds" },
                        ],
                        [
                            { rank: "J", suit: "diamonds" },
                            { rank: "J", suit: "spades" },
                        ],
                        [],
                        [],
                    ]);
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    const currentRoom = socketHandler.getRoom(roomCode);
                    if (currentRoom && currentRoom.gameState) {
                        currentRoom.gameState.players[1].hand = [
                            { rank: "J", suit: "diamonds" },
                            { rank: "J", suit: "spades" },
                        ];
                        currentRoom.gameState.players[1].score = 110;
                        currentRoom.gameState.reshuffleCount = 1;
                    }
                    dealerIndex = payload.dealerIndex;
                    clientSockets[dealerIndex].emit("play_cards", {
                        cardsToPlay: [],
                    });
                    clientSockets[2].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            currentPlayerIndex = newIndex;
                            resolve();
                        }
                    );
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const roundEndedPromise = new Promise((res) => {
                clientSockets[3].once("round_ended", ({ scores }) => {
                    expect(scores[dealerIndex]).toBe(60);
                    expect(scores[currentPlayerIndex]).toBe(70);
                    res(undefined);
                });
            });

            const chooseJackBonusReceivedPromise = new Promise((res) => {
                clientSockets[currentPlayerIndex].once(
                    "choose_jack_bonus",
                    ({ jackCount }) => {
                        expect(jackCount).toBe(2);
                        clientSockets[currentPlayerIndex].emit(
                            "declare_jack_bonus",
                            { option: "MINUS_20" }
                        );
                        res(undefined);
                    }
                );
            });

            clientSockets[currentPlayerIndex].emit("play_cards", {
                cardsToPlay: [
                    { rank: "J", suit: "diamonds" },
                    { rank: "J", suit: "spades" },
                ],
            });

            return Promise.all([
                roundEndedPromise,
                chooseJackBonusReceivedPromise,
            ]);
        });

        test.skip("Should end round with eliminated player", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards([
                        [
                            { rank: "7", suit: "diamonds" },
                            { rank: "Q", suit: "spades" },
                            { rank: "10", suit: "spades" },
                            { rank: "10", suit: "clubs" },
                            { rank: "9", suit: "diamonds" },
                        ],
                        [{ rank: "K", suit: "diamonds" }],
                        [],
                        [],
                    ]);
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    const currentRoom = socketHandler.getRoom(roomCode);
                    if (currentRoom && currentRoom.gameState) {
                        currentRoom.gameState.players[1].hand = [
                            { rank: "K", suit: "diamonds" },
                        ];
                        currentRoom.gameState.players[0].score = 100;
                    }
                    dealerIndex = payload.dealerIndex;
                    clientSockets[dealerIndex].emit("play_cards", {
                        cardsToPlay: [],
                    });
                    clientSockets[2].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            currentPlayerIndex = newIndex;
                            resolve();
                        }
                    );
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const roundEndedPromise = new Promise((res) => {
                clientSockets[3].once(
                    "round_ended",
                    ({ eliminatedIndexes }) => {
                        expect(eliminatedIndexes).toEqual([0]);
                        res(undefined);
                    }
                );
            });

            const roundStartedPromise = new Promise((res) => {
                clientSockets[2].once("round_started", ({ players }) => {
                    expect(players.length).toBe(3);
                    res(undefined);
                });
            });

            clientSockets[currentPlayerIndex].emit("play_cards", {
                cardsToPlay: [{ rank: "K", suit: "diamonds" }],
            });

            return Promise.all([roundEndedPromise, roundStartedPromise]);
        });

        test.skip("Should end game", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards([
                        [
                            { rank: "7", suit: "diamonds" },
                            { rank: "Q", suit: "spades" },
                            { rank: "10", suit: "spades" },
                            { rank: "10", suit: "clubs" },
                            { rank: "9", suit: "diamonds" },
                        ],
                        [{ rank: "K", suit: "diamonds" }],
                    ]);
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    const currentRoom = socketHandler.getRoom(roomCode);
                    if (currentRoom && currentRoom.gameState) {
                        currentRoom.gameState.players[1].hand = [
                            { rank: "K", suit: "diamonds" },
                        ];
                        currentRoom.gameState.players[0].score = 100;
                    }
                    dealerIndex = payload.dealerIndex;
                    clientSockets[dealerIndex].emit("play_cards", {
                        cardsToPlay: [],
                    });
                    clientSockets[1].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            currentPlayerIndex = newIndex;
                            resolve();
                        }
                    );
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const gameEndedPromise = new Promise((res) => {
                clientSockets[1].once(
                    "game_over",
                    ({ finalScores, winnerIndex }) => {
                        expect(winnerIndex).toBe(1);
                        expect(finalScores).toEqual([130, 0]);
                        res(undefined);
                    }
                );
            });

            clientSockets[currentPlayerIndex].emit("play_cards", {
                cardsToPlay: [{ rank: "K", suit: "diamonds" }],
            });

            return gameEndedPromise;
        });
    });
    describe("end_turn", () => {
        let dealerIndex: number;
        let currentPlayerIndex: number;

        beforeEach(
            () =>
                new Promise<void>((resolve) => {
                    let roomCode: string;
                    clientSockets[0].once(
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
                        predictableDeck = reverseDealCards([
                            [
                                { rank: "6", suit: "diamonds" },
                                { rank: "Q", suit: "clubs" },
                                { rank: "10", suit: "spades" },
                                { rank: "10", suit: "hearts" },
                                { rank: "10", suit: "clubs" },
                            ],
                            [
                                { rank: "K", suit: "clubs" },
                                { rank: "8", suit: "clubs" },
                                { rank: "8", suit: "diamonds" },
                                { rank: "6", suit: "clubs" },
                                { rank: "A", suit: "clubs" },
                            ],
                            [],
                            [],
                        ]);
                        mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                        clientSockets[0].emit("player_ready");
                        clientSockets[1].emit("player_ready");
                        clientSockets[2].emit("player_ready");
                        clientSockets[3].emit("player_ready");
                    });
                    clientSockets[0].once("round_started", (payload) => {
                        dealerIndex = payload.dealerIndex;
                        clientSockets[dealerIndex].emit("play_cards", {
                            cardsToPlay: [],
                        });
                        clientSockets[2].on(
                            "turn_started",
                            ({ currentPlayerIndex: newIndex }) => {
                                currentPlayerIndex = newIndex;
                                resolve();
                            }
                        );
                    });

                    clientSockets[0].emit("create_room", {
                        playerName: "testUser1",
                    });
                })
        );

        afterEach(() => {
            predictableDeck = undefined;
        });

        test("Should end turn and return next player index", async () => {
            const cardsPlayedPromise = new Promise((res) => {
                clientSockets[currentPlayerIndex].on("cards_played", () => {
                    res(undefined);
                });
            });

            const handUpdatedPromise = new Promise((res) => {
                clientSockets[currentPlayerIndex].on("hand_update", () => {
                    res(undefined);
                });
            });

            clientSockets[currentPlayerIndex].emit("play_cards", {
                cardsToPlay: [{ rank: "K", suit: "clubs" }],
            });

            await Promise.all([cardsPlayedPromise, handUpdatedPromise]);

            clientSockets[currentPlayerIndex].emit("end_turn");

            const turnStartedPromise = new Promise((res) => {
                clientSockets[0].on(
                    "turn_started",
                    ({ currentPlayerIndex: newIndex }) => {
                        expect(newIndex).toBe(
                            (currentPlayerIndex + 1) % MAX_ROOM_SIZE
                        );
                        res(undefined);
                    }
                );
            });

            return turnStartedPromise;
        });
    });
    describe("draw_card", () => {
        let dealerIndex: number;
        let currentPlayerIndex: number;

        afterEach(() => {
            predictableDeck = undefined;
        });

        test("Should draw a card successfully", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards([
                        [
                            { rank: "6", suit: "diamonds" },
                            { rank: "Q", suit: "clubs" },
                            { rank: "10", suit: "spades" },
                            { rank: "10", suit: "hearts" },
                            { rank: "10", suit: "clubs" },
                        ],
                        [
                            { rank: "K", suit: "hearts" },
                            { rank: "8", suit: "spades" },
                            { rank: "8", suit: "diamonds" },
                            { rank: "7", suit: "spades" },
                            { rank: "A", suit: "spades" },
                        ],
                        [],
                        [],
                    ]);
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    dealerIndex = payload.dealerIndex;
                    clientSockets[dealerIndex].emit("play_cards", {
                        cardsToPlay: [],
                    });
                    clientSockets[2].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            currentPlayerIndex = newIndex;
                            resolve();
                        }
                    );
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const cardDrawnPromise = new Promise((res) => {
                clientSockets[currentPlayerIndex].on("card_drawn", () => {
                    res(undefined);
                });
            });

            clientSockets[currentPlayerIndex].emit("draw_card");

            return cardDrawnPromise;
        });
        test("Should not draw a card successfully - can play", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards([
                        [
                            { rank: "6", suit: "diamonds" },
                            { rank: "Q", suit: "clubs" },
                            { rank: "10", suit: "spades" },
                            { rank: "10", suit: "hearts" },
                            { rank: "10", suit: "clubs" },
                        ],
                        [
                            { rank: "K", suit: "clubs" },
                            { rank: "8", suit: "spades" },
                            { rank: "8", suit: "diamonds" },
                            { rank: "7", suit: "spades" },
                            { rank: "A", suit: "spades" },
                        ],
                        [],
                        [],
                    ]);
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    dealerIndex = payload.dealerIndex;
                    clientSockets[dealerIndex].emit("play_cards", {
                        cardsToPlay: [],
                    });
                    clientSockets[2].on(
                        "turn_started",
                        ({ currentPlayerIndex: newIndex }) => {
                            currentPlayerIndex = newIndex;
                            resolve();
                        }
                    );
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const cardDrawnNotReceivedPromise = new Promise((res) => {
                clientSockets[currentPlayerIndex].on("card_drawn", () => {
                    expect.fail();
                });
                setTimeout(() => {
                    res(undefined);
                }, 10);
            });

            clientSockets[currentPlayerIndex].emit("draw_card");

            return cardDrawnNotReceivedPromise;
        });
        test("Should not draw a card successfully - dealer turn", async () => {
            await new Promise<void>((resolve) => {
                let roomCode: string;
                clientSockets[0].once(
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
                    predictableDeck = reverseDealCards([
                        [
                            { rank: "6", suit: "diamonds" },
                            { rank: "Q", suit: "clubs" },
                            { rank: "10", suit: "spades" },
                            { rank: "10", suit: "hearts" },
                            { rank: "10", suit: "clubs" },
                        ],
                        [],
                        [],
                        [],
                    ]);
                    mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                    clientSockets[0].emit("player_ready");
                    clientSockets[1].emit("player_ready");
                    clientSockets[2].emit("player_ready");
                    clientSockets[3].emit("player_ready");
                });
                clientSockets[0].once("round_started", (payload) => {
                    dealerIndex = payload.dealerIndex;
                    resolve();
                });

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });
            });

            const cardDrawnNotReceivedPromise = new Promise((res) => {
                clientSockets[dealerIndex].on("card_drawn", () => {
                    expect.fail();
                });
                setTimeout(() => {
                    res(undefined);
                }, 10);
            });

            clientSockets[dealerIndex].emit("draw_card");

            return cardDrawnNotReceivedPromise;
        });
    });
});
