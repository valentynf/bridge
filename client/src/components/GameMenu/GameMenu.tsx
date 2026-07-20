import {
    useContext,
    useState,
    type ChangeEventHandler,
    type MouseEventHandler,
} from "react";
import styles from "./GameMenu.module.css";
import { SocketContext } from "../../context/SocketContext";

function GameMenu() {
    const [playerName, setPlayerName] = useState<string>("");
    const [roomCode, setRoomCode] = useState<string>("");

    const socket = useContext(SocketContext);

    const handleNameInputChange: ChangeEventHandler<HTMLInputElement> = (
        event
    ) => {
        setPlayerName(event.currentTarget.value);
    };

    const handleRoomCodeInputChange: ChangeEventHandler<HTMLInputElement> = (
        event
    ) => {
        setRoomCode(event.currentTarget.value);
    };

    const handleCreateGameClick: MouseEventHandler<HTMLButtonElement> = () => {
        if (socket) {
            socket.emit("create_room", { playerName });
        }
    };

    const handleJoinGameClick: MouseEventHandler<HTMLButtonElement> = () => {
        if (socket) {
            socket.emit("join_room", { playerName, roomCode });
        }
    };

    return (
        <>
            <div>
                <div className={`${styles["menu-header"]}`}>
                    <input
                        title="playerName"
                        onChange={handleNameInputChange}
                    ></input>
                </div>
                <div className={`${styles["menu-body"]}`}>
                    <div className={`${styles["create-game"]}`}>
                        <button
                            disabled={playerName === ""}
                            className={`${styles["button-create"]}`}
                            onClick={handleCreateGameClick}
                        >
                            Create game
                        </button>
                    </div>
                    <div className={`${styles["join-game"]}`}>
                        <input
                            title="roomCode"
                            onChange={handleRoomCodeInputChange}
                        ></input>
                        <button
                            onClick={handleJoinGameClick}
                            disabled={roomCode === "" || playerName === ""}
                        >
                            Join game
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default GameMenu;
