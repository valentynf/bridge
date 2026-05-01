import { io } from "socket.io-client";
import "./App.css";

function App() {
    const socket = io();

    return (
        <>
            <section id="center">
                <div>
                    <h1>Bridge</h1>
                </div>
                <button type="button" className="counter" onClick={() => {}}>
                    `Push me ${socket.active}`
                </button>
            </section>
        </>
    );
}

export default App;
