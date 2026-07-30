import { createServer } from "node:http";
import { Server } from "socket.io";
import {
    type ClientToServerEvents,
    type ServerToClientEvents,
} from "../../shared/types.js";
import { GameServer } from "./gameServer.js";
import app from "./app.js";

const port: number = 3000;
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
const gameServer = new GameServer(io);

gameServer.registerSocketEvents();

server.listen(port, () => {
    /* eslint no-console: "off" */
    console.log(`listening on port ${port}`);
});
