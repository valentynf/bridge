import { Server } from "socket.io";
import type {
    BridgeGameState,
    Card,
    ClientToServerEvents,
    GamePlayer,
    LobbyMember,
    LobbyRoom,
    ServerToClientEvents,
} from "../../shared/types.js";
import { generateRoomCode } from "./functions/utility.js";
import { MAX_ROOM_SIZE, MIN_ROOM_SIZE } from "../../shared/consts.js";
import {
    applyPendingEffects,
    checkCanPlay,
    countSpecialEffects,
    dealerOpeningPlay,
    generateInitialState,
    playCards,
} from "./functions/game.js";
import type { Socket } from "socket.io";
import { reshuffleDeck } from "./functions/deck.js";

export class SocketHandler {
    private lobbyRooms: Map<string, LobbyRoom> = new Map();

    constructor(
        private io: Server<ClientToServerEvents, ServerToClientEvents>,
        private customShuffle?: (unshuffledDeck: Card[]) => Card[]
    ) {}

    registerSocketEvents() {
        this.io.on("connection", (socket) => {
            socket.on("create_room", (payload) => {
                const roomId = generateRoomCode();
                const roomMembers: LobbyMember[] = [
                    { name: payload.playerName, id: socket.id, isReady: false },
                ];
                const newRoom: LobbyRoom = {
                    id: roomId,
                    status: "waiting",
                    members: roomMembers,
                    gameState: undefined,
                };
                this.lobbyRooms.set(roomId, newRoom);
                socket.emit("room_created", { roomCode: roomId });
                socket.join(roomId);
                this.io.to(roomId).emit("room_joined", { roomMembers });
            });
            socket.on("join_room", ({ playerName, roomCode }) => {
                const roomToJoin: LobbyRoom | undefined =
                    this.lobbyRooms.get(roomCode);
                if (!roomToJoin) {
                    socket.emit("error", {
                        error: `The room id: ${roomCode} doesn't exist`,
                    });
                    return;
                }
                const numberOfPlayersInRoom = roomToJoin.members.length;
                if (roomToJoin.status === "in_progress") {
                    socket.emit("error", {
                        error: `The room id: ${roomCode} game is in progress`,
                    });
                    return;
                }
                if (numberOfPlayersInRoom === MAX_ROOM_SIZE) {
                    socket.emit("error", {
                        error: `The room id: ${roomCode} is full`,
                    });
                    return;
                }
                const newLobbyMember: LobbyMember = {
                    name: playerName,
                    id: socket.id,
                    isReady: false,
                };
                roomToJoin.members.push(newLobbyMember);
                socket.join(roomCode);
                this.io.to(roomCode).emit("room_joined", {
                    roomMembers: roomToJoin.members,
                });
            });
            socket.on("player_ready", () => {
                const currentRoomCode = [...socket.rooms].filter(
                    (roomId) => roomId !== socket.id
                )[0];
                if (!currentRoomCode) {
                    socket.emit("error", {
                        error: `BUG: The player hasn't joined a room`,
                    });
                    return;
                }
                const currentRoom = this.lobbyRooms.get(currentRoomCode);
                if (!currentRoom) {
                    socket.emit("error", {
                        error: `Room id: ${currentRoomCode} does not exist`,
                    });
                    return;
                }
                const currentRoomMember = currentRoom.members.find(
                    (roomMember) => roomMember.id === socket.id
                );
                if (!currentRoomMember) {
                    socket.emit("error", {
                        error: `Player is not a member of the room (BUG: socket.rooms and lobbyRooms inconsistency!)`,
                    });
                    return;
                }
                currentRoomMember.isReady = true;
                const readyPlayers = currentRoom.members.filter(
                    (member) => member.isReady
                );
                this.io.to(currentRoomCode).emit("player_ready_update", {
                    readyPlayerId: socket.id,
                    readyPlayers,
                });
                const areAllReady: boolean = currentRoom.members.every(
                    (member) => member.isReady
                );
                const isEnoughPlayers =
                    currentRoom.members.length >= MIN_ROOM_SIZE;
                if (areAllReady && isEnoughPlayers) {
                    const dealerIndex = Math.floor(
                        Math.random() * (currentRoom.members.length - 1)
                    );
                    currentRoom.gameState = generateInitialState(
                        currentRoom.members,
                        dealerIndex,
                        this.customShuffle
                    );
                    currentRoom.status = "in_progress";
                    const { players, activePile } = currentRoom.gameState;

                    players.forEach(({ id, hand }) => {
                        this.io.to(id).emit("game_started", {
                            hand,
                            activePileTopCard: activePile[0],
                            dealerIndex,
                            currentPlayerIndex: dealerIndex,
                        });
                    });
                }
            });
            socket.on("play_cards", ({ cardsToPlay }) => {
                const gameContext = this.getGameContext(socket);
                if (!gameContext) {
                    return;
                }
                const { gameState, currentRoomCode } = gameContext;
                const {
                    activePile,
                    drawPile,
                    currentDealerIndex,
                    currentPlayerIndex,
                    reshuffleCount,
                    players,
                    jackSuit,
                } = gameState;
                const currentPlayer: GamePlayer = players[currentPlayerIndex];
                const isDealersTurn: boolean =
                    activePile.length === 1 &&
                    reshuffleCount === 0 &&
                    currentPlayerIndex === currentDealerIndex;
                const onlyPlayedJacks: boolean =
                    cardsToPlay.length > 0 &&
                    cardsToPlay.every((card) => card.rank === "J");

                if (isDealersTurn) {
                    if (cardsToPlay.length > 0) {
                        const playResults = dealerOpeningPlay(
                            currentPlayer.hand,
                            cardsToPlay,
                            activePile[0]
                        );
                        if (!playResults) {
                            socket.emit("error", { error: "Illegal play" });
                            return;
                        }
                        const { updatedActivePile, updatedHand } = playResults;
                        gameState.activePile = updatedActivePile;
                        this.io.to(currentRoomCode).emit("cards_played", {
                            playerId: currentPlayer.id,
                            cardsPlayed: cardsToPlay,
                            activePileTopCard: updatedActivePile[0],
                            handCount: updatedHand.length,
                        });
                        gameState.players[currentPlayerIndex].hand =
                            updatedHand;
                        socket.emit("hand_update", { updatedHand });
                    }
                    const specialEffects = countSpecialEffects(
                        gameState.activePile
                    );
                    if (specialEffects.length > 0) {
                        const affectedPlayerIndex =
                            (currentPlayerIndex + 1) % players.length;
                        const {
                            updatedDrawPile: drawPileAfterEffects,
                            updatedHand: affectedPlayerHand,
                            updatedActivePile: activePileAfterEffects,
                            skipTurn,
                            reshuffled,
                        } = applyPendingEffects(
                            gameState.drawPile,
                            gameState.activePile,
                            gameState.players[affectedPlayerIndex].hand,
                            specialEffects
                        );

                        if (reshuffled) gameState.reshuffleCount++;
                        if (skipTurn) gameState.shouldSkipNextPlayer = true;
                        if (
                            !(
                                affectedPlayerHand.length ===
                                players[affectedPlayerIndex].hand.length
                            )
                        ) {
                            gameState.players[affectedPlayerIndex].hand =
                                affectedPlayerHand;
                            this.io
                                .to(players[affectedPlayerIndex].id)
                                .emit("hand_update", {
                                    updatedHand: affectedPlayerHand,
                                });
                        }
                        gameState.drawPile = drawPileAfterEffects;
                        gameState.activePile = activePileAfterEffects;
                        this.io.to(currentRoomCode).emit("effects_applied", {
                            specialEffects,
                            affectedPlayerIndex,
                        });
                    }

                    if (gameState.shouldSkipNextPlayer) {
                        gameState.currentPlayerIndex =
                            (currentPlayerIndex + 2) % players.length;
                        gameState.shouldSkipNextPlayer = false;
                    } else {
                        gameState.currentPlayerIndex =
                            (currentPlayerIndex + 1) % players.length;
                    }

                    this.io.to(currentRoomCode).emit("turn_started", {
                        currentPlayerIndex: gameState.currentPlayerIndex,
                    });
                } else {
                    if (cardsToPlay.length === 0) {
                        socket.emit("error", {
                            error: `Cannot play empty hand`,
                        });
                        return;
                    }
                    const playResults = playCards(
                        currentPlayer.hand,
                        cardsToPlay,
                        activePile,
                        drawPile,
                        jackSuit
                    );

                    if (!playResults) {
                        socket.emit("error", { error: "Illegal play" });
                        return;
                    }

                    const {
                        updatedHand,
                        updatedActivePile,
                        updatedDrawPile,
                        specialEffects,
                    } = playResults;

                    gameState.activePile = updatedActivePile;
                    gameState.drawPile = updatedDrawPile;
                    gameState.players[currentPlayerIndex].hand = updatedHand;
                    gameState.hasActedThisTurn = true;

                    this.io.to(currentRoomCode).emit("cards_played", {
                        playerId: currentPlayer.id,
                        cardsPlayed: cardsToPlay,
                        activePileTopCard: updatedActivePile[0],
                        handCount: updatedHand.length,
                    });

                    socket.emit("hand_update", { updatedHand });

                    if (specialEffects.length > 0) {
                        const affectedPlayerIndex =
                            (currentPlayerIndex + 1) % players.length;
                        const {
                            updatedDrawPile: drawPileAfterEffects,
                            updatedHand: affectedPlayerHand,
                            updatedActivePile: activePileAfterEffects,
                            skipTurn,
                            reshuffled,
                        } = applyPendingEffects(
                            gameState.drawPile,
                            gameState.activePile,
                            gameState.players[affectedPlayerIndex].hand,
                            specialEffects
                        );

                        if (reshuffled) gameState.reshuffleCount++;
                        if (skipTurn) gameState.shouldSkipNextPlayer = true;
                        if (
                            !(
                                affectedPlayerHand.length ===
                                players[affectedPlayerIndex].hand.length
                            )
                        ) {
                            gameState.players[affectedPlayerIndex].hand =
                                affectedPlayerHand;
                            this.io
                                .to(players[affectedPlayerIndex].id)
                                .emit("hand_update", {
                                    updatedHand: affectedPlayerHand,
                                });
                        }
                        gameState.drawPile = drawPileAfterEffects;
                        gameState.activePile = activePileAfterEffects;
                        this.io.to(currentRoomCode).emit("effects_applied", {
                            specialEffects,
                            affectedPlayerIndex,
                        });
                    }
                }

                if (gameState.activePile.length > 3) {
                    const canBridge =
                        new Set(
                            gameState.activePile
                                .slice(0, 4)
                                .map((card) => card.rank)
                        ).size === 1;
                    if (canBridge) socket.emit("can_bridge");
                }
                if (onlyPlayedJacks) {
                    socket.emit("set_jack_suit");
                    gameState.isPendingSuitDeclaration = true;
                }
            });
            socket.on("end_turn", () => {
                const gameContext = this.getGameContext(socket);
                if (!gameContext) {
                    return;
                }
                const { gameState, currentRoomCode } = gameContext;
                const {
                    currentPlayerIndex,
                    players,
                    shouldSkipNextPlayer,
                    isPendingSuitDeclaration,
                } = gameState;
                if (isPendingSuitDeclaration) {
                    socket.emit("error", {
                        error: "Must declare suit before ending the turn",
                    });
                    return;
                }

                const numberOfPlayers = players.length;
                const nextPlayerIndex =
                    (currentPlayerIndex + (shouldSkipNextPlayer ? 2 : 1)) %
                    numberOfPlayers;

                gameState.currentPlayerIndex = nextPlayerIndex;
                gameState.shouldSkipNextPlayer = false;
                gameState.hasActedThisTurn = false;

                this.io.to(currentRoomCode).emit("turn_started", {
                    currentPlayerIndex: gameState.currentPlayerIndex,
                });
            });
            socket.on("declare_suit", ({ suit }) => {
                const gameContext = this.getGameContext(socket);
                if (!gameContext) {
                    return;
                }
                const { gameState, currentRoomCode } = gameContext;

                gameState.jackSuit = suit;
                gameState.isPendingSuitDeclaration = false;
                this.io.to(currentRoomCode).emit("suit_declared", { suit });
            });
            socket.on("declare_bridge", () => {
                const gameContext = this.getGameContext(socket);
                if (!gameContext) {
                    return;
                }
                const { gameState, currentRoomCode } = gameContext;

                const { currentPlayerIndex } = gameState;

                this.io.to(currentRoomCode).emit("bridge_declared");
                this.io
                    .to(currentRoomCode)
                    .emit("round_won", { winnerIndex: currentPlayerIndex });
                this.io.to(currentRoomCode).emit("round_ended");
            });
            socket.on("draw_card", () => {
                const gameContext = this.getGameContext(socket);
                if (!gameContext) {
                    return;
                }
                const { gameState, currentRoomCode } = gameContext;
                const {
                    currentPlayerIndex,
                    currentDealerIndex,
                    hasActedThisTurn,
                    activePile,
                    players,
                    jackSuit,
                    reshuffleCount,
                } = gameState;
                const isDealersTurn =
                    activePile.length === 1 &&
                    reshuffleCount === 0 &&
                    currentPlayerIndex === currentDealerIndex;
                if (isDealersTurn) {
                    socket.emit("error", {
                        error: "You cannot draw cards during first dealer turn",
                    });
                    return;
                }
                if (hasActedThisTurn) {
                    socket.emit("error", {
                        error: "You have already acted during this turn",
                    });
                    return;
                }
                const hasPlayableCards = checkCanPlay(
                    activePile[0],
                    players[currentPlayerIndex].hand,
                    jackSuit
                );
                if (hasPlayableCards) {
                    socket.emit("error", {
                        error: "You can already play cards",
                    });
                    return;
                }
                let topDrawPileCard = gameState.drawPile.shift();
                if (!topDrawPileCard) {
                    const { updatedActivePile, updatedDrawPile } =
                        reshuffleDeck(gameState.activePile);
                    gameState.activePile = updatedActivePile;
                    gameState.drawPile = updatedDrawPile;
                    topDrawPileCard = gameState.drawPile.shift();
                    if (!topDrawPileCard) return;
                }
                gameState.players[currentPlayerIndex].hand.push(
                    topDrawPileCard
                );
                const updatedHand: Card[] =
                    gameState.players[currentPlayerIndex].hand;
                gameState.hasActedThisTurn = true;
                this.io.to(currentRoomCode).emit("card_drawn", {
                    playerId: socket.id,
                    drawPileCount: gameState.drawPile.length,
                    handCount: updatedHand.length,
                });
                socket.emit("hand_update", { updatedHand });
            });
        });
    }

    resetLobby() {
        this.lobbyRooms.forEach((_, roomId) => this.io.socketsLeave(roomId));
        this.lobbyRooms.clear();
    }

    getRoom(roomCode: string): LobbyRoom | undefined {
        return this.lobbyRooms.get(roomCode);
    }

    setRoom(roomCode: string, room: LobbyRoom) {
        this.lobbyRooms.set(roomCode, room);
    }

    private getGameContext(
        socket: Socket<ClientToServerEvents, ServerToClientEvents>
    ): { currentRoomCode: string; gameState: BridgeGameState } | undefined {
        const currentRoomCode = [...socket.rooms].filter(
            (roomId) => roomId !== socket.id
        )[0];
        if (!currentRoomCode) {
            socket.emit("error", {
                error: `The player hasn't joined any room`,
            });
            return;
        }
        const currentRoom = this.lobbyRooms.get(currentRoomCode);
        if (!currentRoom) {
            socket.emit("error", {
                error: `Invalid room id`,
            });
            return;
        }
        const { gameState } = currentRoom;
        if (!gameState) {
            socket.emit("error", {
                error: `The game has not started yet`,
            });
            return;
        }

        return { currentRoomCode, gameState };
    }
}
