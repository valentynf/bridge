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
        test("Should generate new game state", () => {
            return new Promise<void>((resolve) => {
                let roomCode: string;
                const gameStartedPromises = clientSockets
                    .filter((_, i) => i < 4)
                    .map(
                        (socket) =>
                            new Promise((res) => {
                                socket.once(
                                    "game_started",
                                    ({
                                        hand,
                                        dealerIndex,
                                        currentPlayerIndex,
                                    }) => {
                                        expect(Array.isArray(hand)).toBe(true);
                                        expect(
                                            Number.isInteger(dealerIndex)
                                        ).toBe(true);
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

                clientSockets[0].emit("create_room", {
                    playerName: "testUser1",
                });

                Promise.all(gameStartedPromises).finally(() => resolve());
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
                        clientSockets[0].once("game_started", (payload) => {
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
                    }, 50);
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
                        clientSockets[0].once("game_started", (payload) => {
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

                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [{ rank: "7", suit: "clubs" }],
                });

                await Promise.all([
                    cardsPlayedPromise,
                    handUpdatedPromise,
                    oneCardReceivedPromise,
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
                    }, 50);
                });

                clientSockets[currentPlayerIndex].emit("play_cards", {
                    cardsToPlay: [{ rank: "A", suit: "clubs" }],
                });

                await Promise.all([
                    cardsPlayedPromise,
                    handUpdatedPromise,
                    handUpdateNotReceived,
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
                                [],
                                [],
                            ]);
                            mathRandomSpy.mockReturnValue(0.1); //this makes dealerIndex 0 for testing purposes
                            clientSockets[0].emit("player_ready");
                            clientSockets[1].emit("player_ready");
                            clientSockets[2].emit("player_ready");
                            clientSockets[3].emit("player_ready");
                        });
                        clientSockets[0].once("game_started", (payload) => {
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

                const roundWonPromise = new Promise((res) => {
                    clientSockets[0].on("round_won", ({ winnerIndex }) => {
                        expect(winnerIndex).toBe(currentPlayerIndex);
                        res(undefined);
                    });
                });

                const roundEndedPromise = new Promise((res) => {
                    clientSockets[0].on("round_ended", () => {
                        res(undefined);
                    });
                });

                return Promise.all([roundWonPromise, roundEndedPromise]);
            });
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
                    clientSockets[0].once("game_started", (payload) => {
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
});
