import { Server } from "socket.io";
import type {
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
    dealerOpeningPlay,
    generateInitialState,
    playCards,
} from "./functions/game.js";
export const lobbyRooms: Map<string, LobbyRoom> = new Map();

export const registerSocketEvents = (
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    customShuffle?: (unshuffledDeck: Card[]) => Card[]
): void => {
    io.on("connection", (socket) => {
        console.log("Connected user, socketId:" + socket.id);

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
            lobbyRooms.set(roomId, newRoom);
            socket.emit("room_created", { roomCode: roomId });
            socket.join(roomId);
            io.to(roomId).emit("room_joined", { roomMembers });
        });
        socket.on("join_room", ({ playerName, roomCode }) => {
            const roomToJoin: LobbyRoom | undefined = lobbyRooms.get(roomCode);
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
            io.to(roomCode).emit("room_joined", {
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
            const currentRoom = lobbyRooms.get(currentRoomCode);
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
            io.to(currentRoomCode).emit("player_ready_update", {
                readyPlayerId: socket.id,
                readyPlayers,
            });
            const areAllReady: boolean = currentRoom.members.every(
                (member) => member.isReady
            );
            const isEnoughPlayers = currentRoom.members.length >= MIN_ROOM_SIZE;
            if (areAllReady && isEnoughPlayers) {
                const dealerIndex = Math.floor(
                    Math.random() * (currentRoom.members.length - 1)
                );
                currentRoom.gameState = generateInitialState(
                    currentRoom.members,
                    dealerIndex,
                    customShuffle
                );
                currentRoom.status = "in_progress";
                const { players, activePile } = currentRoom.gameState;

                players.forEach(({ id, hand }) => {
                    io.to(id).emit("game_started", {
                        hand,
                        activePileTopCard: activePile[0],
                        dealerIndex,
                        currentPlayerIndex: dealerIndex,
                    });
                });
            }
        });
        socket.on("play_cards", ({ cardsToPlay }) => {
            const currentRoomCode = [...socket.rooms].filter(
                (roomId) => roomId !== socket.id
            )[0];
            if (!currentRoomCode) {
                socket.emit("error", {
                    error: `The player hasn't joined any room`,
                });
                return;
            }
            const currentRoom = lobbyRooms.get(currentRoomCode);
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
            if (isDealersTurn) {
                if (cardsToPlay.length > 0) {
                    const { updatedActivePile, updatedHand } =
                        dealerOpeningPlay(
                            currentPlayer.hand,
                            cardsToPlay,
                            activePile[0]
                        );
                    gameState.activePile = updatedActivePile;
                    io.to(currentRoomCode).emit("cards_played", {
                        playerId: currentPlayer.id,
                        cardsPlayed: cardsToPlay,
                        activePileTopCard: updatedActivePile[0],
                        handCount: updatedHand.length,
                    });
                    gameState.players[currentPlayerIndex].hand = updatedHand;
                    socket.emit("hand_update", { updatedHand });
                }
                gameState.currentPlayerIndex =
                    (currentPlayerIndex + 1) % players.length;
                io.to(currentRoomCode).emit("turn_started", {
                    currentPlayerIndex: gameState.currentPlayerIndex,
                });
                console.log(
                    `dealerIndex ${currentDealerIndex} currentPlayerIndex ${currentPlayerIndex}`
                );
            } else {
                //let go boii
                console.log("boiii");
                const { updatedHand, updatedActivePile, updatedDrawPile } =
                    playCards(
                        currentPlayer.hand,
                        cardsToPlay,
                        activePile,
                        drawPile,
                        jackSuit
                    );

                gameState.activePile = updatedActivePile;
                gameState.drawPile = updatedDrawPile;
                gameState.players[currentPlayerIndex].hand = updatedHand;

                io.to(currentRoomCode).emit("cards_played", {
                    playerId: currentPlayer.id,
                    cardsPlayed: cardsToPlay,
                    activePileTopCard: updatedActivePile[0],
                    handCount: updatedHand.length,
                });

                socket.emit("hand_update", { updatedHand });
            }
        });
        socket.on("end_turn", () => {
            const currentRoomCode = [...socket.rooms].filter(
                (roomId) => roomId !== socket.id
            )[0];
            if (!currentRoomCode) {
                socket.emit("error", {
                    error: `The player hasn't joined any room`,
                });
                return;
            }
            const currentRoom = lobbyRooms.get(currentRoomCode);
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

            const { currentPlayerIndex, players } = gameState;

            gameState.currentPlayerIndex =
                (currentPlayerIndex + 1) % players.length;

            io.to(currentRoomCode).emit("turn_started", {
                currentPlayerIndex: gameState.currentPlayerIndex,
            });
        });
    });
};

export const resetLobby = (
    io: Server<ClientToServerEvents, ServerToClientEvents>
): void => {
    lobbyRooms.forEach((_, roomId) => io.socketsLeave(roomId));
    lobbyRooms.clear();
};
