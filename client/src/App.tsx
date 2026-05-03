import { io, Socket } from "socket.io-client";
import "./App.css";
import {
    type ServerToClientEvents,
    type ClientToServerEvents,
} from "../../shared/types";

function App() {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

    socket.on("room_created", (args) => {
        console.log(args);
    });

    socket.on("room_joined", () => {
        //changing view to room and stuff
    });

    return (
        <>
            <section id="center">
                <div>
                    <h1>Bridge</h1>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        socket.emit("create_room", "user1");
                    }}
                >
                    `Create room`
                </button>
                <button type="button" onClick={() => {}}>
                    `Join room`
                </button>
            </section>
        </>
    );
}

export default App;
