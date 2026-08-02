import { useState, type ChangeEventHandler } from "react";
import styles from "./MenuScreen.module.css";
import { ROOM_CODE_REGEX } from "../../../../shared/validations.js";
import { useSocket } from "../../hooks/useSocket.js";

type MenuScreenProps = {
    nickname: string;
    onLogout: () => void;
};

function MenuScreen({ nickname, onLogout }: MenuScreenProps) {
    const [roomCode, setRoomCode] = useState<string>("");

    const socket = useSocket();

    const handleRoomCodeInputChange: ChangeEventHandler<HTMLInputElement> = (
        event
    ) => {
        setRoomCode(event.currentTarget.value.toLowerCase());
    };

    const handleCreateGameClick = () => {
        socket.emit("create_room");
    };

    const handleJoinGameClick = () => {
        socket.emit("join_room", {
            roomCode,
        });
    };

    return (
        <div className={styles["menu-root"]}>
            <div className={styles["logout-bar"]}>
                <p className={styles["hello-user-text"]}>Hello, {nickname}!</p>
                <button onClick={onLogout} className={styles["logout-button"]}>
                    Logout
                </button>
            </div>
            <div className={styles["menu-header"]}>
                <h1 className={styles["title"]}>Bridge</h1>
            </div>
            <div className={styles["menu-body"]}>
                <div className={styles["create-game"]}>
                    <button
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
                        disabled={!ROOM_CODE_REGEX.test(roomCode)}
                    >
                        Join game
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MenuScreen;
