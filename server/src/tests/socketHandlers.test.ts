import { Server } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { afterAll, beforeAll, describe } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { registerSocketEvents } from "../socketHandlers.js";

describe.skip("registerSocketEvents", () => {
    let io: Server, clientSocket: ClientSocket;

    beforeAll(() => {
        return new Promise((resolve) => {
            const httpServer = createServer();
            io = new Server(httpServer);
            httpServer.listen(() => {
                const port = (httpServer.address() as AddressInfo).port;
                clientSocket = ioc(`http://localhost:${port}`);
                registerSocketEvents(io);
                clientSocket.on("connect", () => resolve(undefined));
            });
        });
    });

    afterAll(() => {
        io.close();
        clientSocket.disconnect();
    });
});
