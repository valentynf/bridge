import { useState, type ChangeEventHandler } from "react";
import styles from "./Menu.module.css";
import {
    ROOM_CODE_REGEX,
    PLAYER_NAME_REGEX,
} from "../../../../shared/validations.js";
import { useSocket } from "../../hooks/useSocket.js";

function Menu() {
    const [playerName, setPlayerName] = useState<string>("");
    const [roomCode, setRoomCode] = useState<string>("");

    const socket = useSocket();

    const handleNameInputChange: ChangeEventHandler<HTMLInputElement> = (
        event
    ) => {
        setPlayerName(event.currentTarget.value);
    };

    const handleRoomCodeInputChange: ChangeEventHandler<HTMLInputElement> = (
        event
    ) => {
        setRoomCode(event.currentTarget.value.toLowerCase());
    };

    const handleCreateGameClick = () => {
        socket.emit("create_room", { playerName });
    };

    const handleJoinGameClick = () => {
        socket.emit("join_room", {
            playerName,
            roomCode,
        });
    };

    return (
        <div className={styles["menu-root"]}>
            <div className={styles["menu-header"]}>
                <h1 className={styles["title"]}>Bridge</h1>
                <label htmlFor="playerName">user name</label>
                <input
                    maxLength={12}
                    id="playerName"
                    onChange={handleNameInputChange}
                    style={{
                        borderColor:
                            playerName.length > 0 &&
                            !PLAYER_NAME_REGEX.test(playerName)
                                ? "var(--color-accent)"
                                : undefined,
                    }}
                ></input>
            </div>
            <div className={styles["menu-body"]}>
                <div className={styles["create-game"]}>
                    <button
                        disabled={!PLAYER_NAME_REGEX.test(playerName)}
                        className={styles["button-create"]}
                        onClick={handleCreateGameClick}
                    >
                        Create game
                    </button>
                </div>
                <div className={styles["join-game"]}>
                    <label htmlFor="roomCode">room code</label>
                    <input
                        maxLength={5}
                        id="roomCode"
                        onChange={handleRoomCodeInputChange}
                        style={{
                            borderColor:
                                roomCode.length > 0 &&
                                !ROOM_CODE_REGEX.test(roomCode)
                                    ? "var(--color-accent)"
                                    : undefined,
                        }}
                    ></input>
                    <button
                        className={styles["button-join"]}
                        onClick={handleJoinGameClick}
                        disabled={
                            !ROOM_CODE_REGEX.test(roomCode) ||
                            !PLAYER_NAME_REGEX.test(playerName)
                        }
                    >
                        Join game
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Menu;
