import express, { type Application } from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const port: number = 3000;
const app: Application = express();
const server = createServer(app);
const io = new Server(server);

app.get("/", (_, res) => {
    res.send("Hello World!");
});

io.on("connection", () => {
    console.log("Connected user++");
});

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
