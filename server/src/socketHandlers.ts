import { Server } from "socket.io";
import type {
    ClientToServerEvents,
    LobbyMember,
    LobbyRoom,
    ServerToClientEvents,
} from "../../shared/types.js";
import { generateRoomCode } from "./functions/utility.js";
import { MAX_ROOM_SIZE, MIN_ROOM_SIZE } from "../../shared/consts.js";
import { generateInitialState } from "./functions/game.js";
export const lobbyRooms: Map<string, LobbyRoom> = new Map();

export const registerSocketEvents = (
    io: Server<ClientToServerEvents, ServerToClientEvents>
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
                    dealerIndex
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
    });
};

/* game_started: (payload: {
        hand: Card[];
        activePileTopCard: Card;
        dealerIndex: number;
        currentPlayerIndex: number;
    }
*/

export const resetLobby = (
    io: Server<ClientToServerEvents, ServerToClientEvents>
): void => {
    lobbyRooms.forEach((_, roomId) => io.socketsLeave(roomId));
    lobbyRooms.clear();
};
