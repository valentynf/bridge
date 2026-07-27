import { Server } from "socket.io";
import type {
    BridgeGameState,
    Card,
    ClientToServerEvents,
    GamePlayer,
    JackEndEffect,
    LobbyMember,
    LobbyRoom,
    RoundPlayer,
    ServerToClientEvents,
} from "../../shared/types.js";
import { generateRoomCode, getDrawPileSize } from "./functions/utility.js";
import { MAX_ROOM_SIZE, MIN_ROOM_SIZE } from "../../shared/consts.js";
import {
    applyPendingEffects,
    checkCanPlay,
    countPoints,
    countSpecialEffects,
    dealerOpeningPlay,
    generateInitialState,
    playCards,
} from "./functions/game.js";
import type { Socket } from "socket.io";
import { reshuffleDeck } from "./functions/deck.js";
import {
    PLAYER_NAME_REGEX,
    ROOM_CODE_REGEX,
} from "../../shared/validations.js";

export class GameServer {
    private rooms: Map<string, LobbyRoom>;
    private customShuffle: ((unshuffledDeck: Card[]) => Card[]) | undefined;

    constructor(
        private io: Server<ClientToServerEvents, ServerToClientEvents>,
        options?: {
            customShuffle?: (unshuffledDeck: Card[]) => Card[];
            rooms?: Map<string, LobbyRoom>;
        }
    ) {
        this.rooms = options?.rooms ?? new Map();
        this.customShuffle = options?.customShuffle;
    }

    registerSocketEvents() {
        this.io.on("connection", (socket) => {
            socket.on("create_room", ({ playerName }) => {
                if (!PLAYER_NAME_REGEX.test(playerName)) {
                    socket.emit("error", {
                        error: "Validation error: incorrect player name",
                    });
                    return;
                }

                const roomId = generateRoomCode();
                const roomMembers: LobbyMember[] = [
                    {
                        nickname: playerName,
                        id: socket.id,
                        isReady: false,
                    },
                ];
                const newRoom: LobbyRoom = {
                    id: roomId,
                    status: "waiting",
                    members: roomMembers,
                    gameState: undefined,
                };
                this.rooms.set(roomId, newRoom);
                socket.emit("room_created", { roomCode: roomId });
                socket.join(roomId);
                this.io.to(roomId).emit("room_joined", { roomMembers });
            });
            socket.on("join_room", ({ playerName, roomCode }) => {
                if (!PLAYER_NAME_REGEX.test(playerName)) {
                    socket.emit("error", {
                        error: "Validation error: incorrect player name",
                    });
                    return;
                }
                if (!ROOM_CODE_REGEX.test(roomCode)) {
                    socket.emit("error", {
                        error: "Validation error: incorrect player name",
                    });
                    return;
                }
                const roomToJoin: LobbyRoom | undefined =
                    this.rooms.get(roomCode);
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
                    nickname: playerName,
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
                const currentRoom = this.rooms.get(currentRoomCode);
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
                        error: `Player is not a member of the room (BUG: socket.rooms and rooms inconsistency!)`,
                    });
                    return;
                }
                if (currentRoomMember.isReady) {
                    socket.emit("error", { error: "Player is already ready!" });
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
                    if (currentRoom.gameState.activePile[0].rank === "6")
                        currentRoom.gameState.isCoveringRequired = true;
                    currentRoom.status = "in_progress";
                    const { players, activePile, drawPile } =
                        currentRoom.gameState;

                    const roundPlayers: RoundPlayer[] = players.map(
                        (player) => ({
                            nickname: player.nickname,
                            id: player.id,
                            score: player.score,
                        })
                    );

                    this.io.to(currentRoomCode).emit("game_started");

                    players.forEach(({ id, hand }) => {
                        this.io.to(id).emit("round_started", {
                            hand,
                            activePileTopCard: activePile[0],
                            drawPileSize: getDrawPileSize(drawPile.length),
                            dealerIndex,
                            currentPlayerIndex: dealerIndex,
                            players: roundPlayers,
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
                    isCoveringRequired,
                } = gameState;
                if (socket.id !== players[currentPlayerIndex].id) {
                    socket.emit("error", {
                        error: "Illegal play - different player turn",
                    });
                    return;
                }
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
                        let updatedActivePile, updatedHand;
                        if (isCoveringRequired) {
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
                            if (!playResults.needsCover)
                                gameState.isCoveringRequired = false;

                            updatedActivePile = playResults.updatedActivePile;
                            updatedHand = playResults.updatedHand;
                        } else {
                            const playResults = dealerOpeningPlay(
                                currentPlayer.hand,
                                cardsToPlay,
                                activePile[0]
                            );
                            if (!playResults) {
                                socket.emit("error", { error: "Illegal play" });
                                return;
                            }
                            updatedActivePile = playResults.updatedActivePile;
                            updatedHand = playResults.updatedHand;
                        }

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

                        if (reshuffled) {
                            gameState.reshuffleCount++;
                            this.io
                                .to(currentRoomCode)
                                .emit("pile_reshuffled", {
                                    drawPileSize: getDrawPileSize(
                                        drawPileAfterEffects.length
                                    ),
                                    reshuffleMultiplier:
                                        gameState.reshuffleCount,
                                });
                        }
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
                        needsCover,
                    } = playResults;

                    gameState.activePile = updatedActivePile;
                    gameState.drawPile = updatedDrawPile;
                    gameState.players[currentPlayerIndex].hand = updatedHand;

                    if (needsCover) {
                        gameState.isCoveringRequired = true;
                    } else if (gameState.isCoveringRequired) {
                        gameState.isCoveringRequired = false;
                        gameState.hasActedThisTurn = true;
                    } else {
                        gameState.hasActedThisTurn = true;
                    }

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

                        if (reshuffled) {
                            gameState.reshuffleCount++;
                            this.io
                                .to(currentRoomCode)
                                .emit("pile_reshuffled", {
                                    drawPileSize: getDrawPileSize(
                                        drawPileAfterEffects.length
                                    ),
                                    reshuffleMultiplier:
                                        gameState.reshuffleCount,
                                });
                        }
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

                    if (updatedHand.length === 0 && !needsCover) {
                        if (onlyPlayedJacks) {
                            gameState.pendingJackBonusCount =
                                cardsToPlay.length;
                            socket.emit("choose_jack_bonus", {
                                jackCount: cardsToPlay.length,
                            });
                            return;
                        }
                        this.handleRoundEnd(
                            gameState,
                            currentRoomCode,
                            currentPlayerIndex
                        );
                        return;
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
                    isCoveringRequired,
                    hasActedThisTurn,
                } = gameState;

                if (socket.id !== players[currentPlayerIndex].id) {
                    socket.emit("error", {
                        error: "Illegal play - different player turn",
                    });
                    return;
                }
                if (!hasActedThisTurn) {
                    socket.emit("error", {
                        error: "Player has not acted this turn",
                    });
                    return;
                }
                if (isCoveringRequired) {
                    socket.emit("error", {
                        error: "Must cover six before ending turn",
                    });
                    return;
                }
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
                const {
                    players,
                    currentPlayerIndex,
                    isPendingSuitDeclaration,
                } = gameState;
                if (!isPendingSuitDeclaration) {
                    socket.emit("error", {
                        error: "No pending suit declaration",
                    });
                    return;
                }
                if (socket.id !== players[currentPlayerIndex].id) {
                    socket.emit("error", {
                        error: "Illegal play - different player turn",
                    });
                    return;
                }
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
                const { currentPlayerIndex, activePile, players } = gameState;
                if (socket.id !== players[currentPlayerIndex].id) {
                    socket.emit("error", {
                        error: "Illegal play - different player turn",
                    });
                    return;
                }
                const canBridge =
                    activePile.length >= 4 &&
                    new Set(activePile.slice(0, 4).map((card) => card.rank))
                        .size === 1;
                if (!canBridge) {
                    socket.emit("error", { error: "Not eligible to bridge" });
                    return;
                }

                this.io.to(currentRoomCode).emit("bridge_declared");
                this.handleRoundEnd(
                    gameState,
                    currentRoomCode,
                    currentPlayerIndex
                );
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
                    isCoveringRequired,
                } = gameState;

                if (socket.id !== players[currentPlayerIndex].id) {
                    socket.emit("error", {
                        error: "Illegal play - different player turn",
                    });
                    return;
                }

                const isDealersTurn =
                    activePile.length === 1 &&
                    reshuffleCount === 0 &&
                    currentPlayerIndex === currentDealerIndex;
                if (isDealersTurn && !isCoveringRequired) {
                    socket.emit("error", {
                        error: "You cannot draw cards during first dealer turn",
                    });
                    return;
                }
                if (hasActedThisTurn && !isCoveringRequired) {
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
                    gameState.reshuffleCount++;
                    this.io.to(currentRoomCode).emit("pile_reshuffled", {
                        drawPileSize: getDrawPileSize(updatedDrawPile.length),
                        reshuffleMultiplier: gameState.reshuffleCount,
                    });

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
                if (!isCoveringRequired) gameState.hasActedThisTurn = true;

                this.io.to(currentRoomCode).emit("card_drawn", {
                    playerId: socket.id,
                    drawPileSize: getDrawPileSize(gameState.drawPile.length),
                    handCount: updatedHand.length,
                });
                socket.emit("hand_update", { updatedHand });
            });
            socket.on("declare_jack_bonus", ({ option }) => {
                const gameContext = this.getGameContext(socket);
                if (!gameContext) {
                    return;
                }
                const { gameState, currentRoomCode } = gameContext;
                const { currentPlayerIndex, pendingJackBonusCount, players } =
                    gameState;
                if (socket.id !== players[currentPlayerIndex].id) {
                    socket.emit("error", {
                        error: "Illegal play - different player turn",
                    });
                    return;
                }
                if (!pendingJackBonusCount) {
                    socket.emit("error", {
                        error: "Illegal play - not eligible to declare jack bonus",
                    });
                    return;
                }
                const jackEndEffect: JackEndEffect = {
                    option,
                    count: pendingJackBonusCount,
                };
                gameState.pendingJackBonusCount = undefined;
                this.handleRoundEnd(
                    gameState,
                    currentRoomCode,
                    currentPlayerIndex,
                    jackEndEffect
                );
            });
        });
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
        const currentRoom = this.rooms.get(currentRoomCode);
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

    private handleRoundEnd(
        gameState: BridgeGameState,
        currentRoomCode: string,
        winnerIndex: number,
        jackEndEffect?: JackEndEffect
    ) {
        const { players, reshuffleCount } = gameState;

        let scores: number[] = countPoints(
            players.map((player) => player.hand),
            winnerIndex,
            reshuffleCount,
            players.map((player) => player.score),
            jackEndEffect
        );
        const eliminatedIndexes: number[] = scores.reduce(
            (acc, score, index) => {
                if (score > 120) acc.push(index);
                return acc;
            },
            [] as number[]
        );
        scores = scores.map((score, index) => {
            if (score === 120) {
                this.io
                    .to(currentRoomCode)
                    .emit("score_reset", { playerIndex: index });
                return 0;
            }
            return score;
        });
        gameState.players.forEach((player, index) => {
            player.score = scores[index];
            if (eliminatedIndexes.includes(index)) {
                player.isEliminated = true;
            }
        });

        this.io.to(currentRoomCode).emit("round_ended", {
            scores,
            winnerIndex,
            eliminatedIndexes,
            reshuffleMultiplier: reshuffleCount,
        });

        const nextRoundPlayers = gameState.players.filter(
            (player) => player.isEliminated === false
        );

        gameState.players = nextRoundPlayers;

        if (nextRoundPlayers.length === 1) {
            const gameWinnerIndex = scores.findIndex(
                (_, i) => !eliminatedIndexes.includes(i)
            );
            this.io.to(currentRoomCode).emit("game_over", {
                finalScores: scores,
                winnerIndex: gameWinnerIndex,
            });
        } else {
            let highestScore: number = -1;
            let nextDealerIndex: number = 0;
            for (let i = 0; i < nextRoundPlayers.length; i++) {
                if (nextRoundPlayers[i].score > highestScore) {
                    highestScore = nextRoundPlayers[i].score;
                    nextDealerIndex = i;
                } else if (nextRoundPlayers[i].score === highestScore) {
                    nextDealerIndex = Math.random() > 0.5 ? nextDealerIndex : i;
                }
            }

            Object.assign(
                gameState,
                generateInitialState(
                    nextRoundPlayers.map((player) => ({
                        nickname: player.nickname,
                        id: player.id,
                        isReady: true,
                    })),
                    nextDealerIndex,
                    this.customShuffle
                )
            );

            for (let i = 0; i < nextRoundPlayers.length; i++) {
                gameState.players[i].score = nextRoundPlayers[i].score;
            }

            if (gameState.activePile[0].rank === "6")
                gameState.isCoveringRequired = true;

            const roundPlayers: RoundPlayer[] = gameState.players.map(
                (player) => ({
                    nickname: player.nickname,
                    id: player.id,
                    score: player.score,
                })
            );

            gameState.players.forEach(({ id, hand }) => {
                this.io.to(id).emit("round_started", {
                    hand,
                    activePileTopCard: gameState.activePile[0],
                    drawPileSize: getDrawPileSize(gameState.drawPile.length),
                    dealerIndex: gameState.currentDealerIndex,
                    currentPlayerIndex: gameState.currentDealerIndex,
                    players: roundPlayers,
                });
            });
        }
    }
}
