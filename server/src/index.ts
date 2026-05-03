import express, { type Application } from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
    type ClientToServerEvents,
    type LobbyMember,
    type LobbyRoom,
    type ServerToClientEvents,
} from "../../shared/types.js";
import { generateRoomCode } from "./functions/utility.js";
import { MAX_ROOM_SIZE, MIN_ROOM_SIZE } from "../../shared/consts.js";

const port: number = 3000;
const app: Application = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
const lobbyRooms: Map<string, LobbyRoom> = new Map();

app.get("/", (_, res) => {
    res.send("Hello World!");
});

io.on("connection", (socket) => {
    console.log("Connected user, socketId:" + socket.id);

    socket.on("create_room", (playerName) => {
        const roomId = generateRoomCode();
        const roomMembers: LobbyMember[] = [
            { name: playerName, id: socket.id, isReady: false },
        ];
        const newRoom: LobbyRoom = {
            id: roomId,
            status: "waiting",
            members: roomMembers,
        };
        lobbyRooms.set(roomId, newRoom);
        socket.emit("room_created", { roomCode: roomId });
        socket.join(roomId);
        io.to(roomId).emit("room_joined", roomMembers);
    });
    socket.on("join_room", ({ playerName, roomCode }) => {
        const roomToJoin: LobbyRoom | undefined = lobbyRooms.get(roomCode);
        if (!roomToJoin) {
            socket.emit("error", `The room id: ${roomCode} doesn't exist`);
            return;
        }
        const numberOfPlayersInRoom = roomToJoin.members.length;
        if (roomToJoin.status === "in_progress") {
            socket.emit("error", `The room id: ${roomCode} is playing`);
            return;
        }
        if (numberOfPlayersInRoom === MAX_ROOM_SIZE) {
            socket.emit("error", `The room id: ${roomCode} is full`);
            return;
        }
        const newLobbyMember: LobbyMember = {
            name: playerName,
            id: socket.id,
            isReady: false,
        };
        roomToJoin.members.push(newLobbyMember);
        socket.join(roomCode);
        io.to(roomCode).emit("room_joined", roomToJoin.members);
    });
    socket.on("player_ready", () => {
        const currentRoomCode = [...socket.rooms].filter(
            (roomId) => roomId !== socket.id
        )[0];
        if (!currentRoomCode) {
            socket.emit("error", `The player hasn't joined a room`);
            return;
        }
        const currentRoom = lobbyRooms.get(currentRoomCode);
        if (!currentRoom) {
            socket.emit("error", `Room id: ${currentRoomCode} does not exist`);
            return;
        }
        const currentRoomMember = currentRoom.members.find(
            (roomMember) => roomMember.id === socket.id
        );
        if (!currentRoomMember) {
            socket.emit(
                "error",
                `Player is not a member of the room (BUG: socket.rooms and loobyRooms inconsistency!)`
            );
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
        if (areAllReady && isEnoughPlayers)
            io.to(currentRoomCode).emit("game_started");
    });
});

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
