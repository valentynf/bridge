import express, { type Application } from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
    type ClientToServerEvents,
    type ServerToClientEvents,
} from "../../shared/types.js";
import { registerSocketEvents } from "./socketHandlers.js";

const port: number = 3000;
const app: Application = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
registerSocketEvents(io);

app.get("/", (_, res) => {
    res.send("Hello World!");
});

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
