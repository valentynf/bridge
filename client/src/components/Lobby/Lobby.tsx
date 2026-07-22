import { useContext, useState, type MouseEventHandler } from "react";
import type { LobbyMember } from "../../../../shared/types";
import styles from "./Lobby.module.css";
import { SocketContext } from "../../context/SocketContext";

type LobbyProps = {
    roomMembers: LobbyMember[];
    roomCode: string;
};

function Lobby({ roomMembers, roomCode }: LobbyProps) {
    const socket = useContext(SocketContext);
    const [isReadyClicked, setIsReadyClicked] = useState<boolean>(false);

    const readyClickHandler: MouseEventHandler<HTMLButtonElement> = () => {
        if (socket) socket.emit("player_ready");
        setIsReadyClicked(true);
    };

    const copyCodeClickHandler: MouseEventHandler<HTMLButtonElement> = () => {
        navigator.clipboard.writeText(roomCode);
    };

    return (
        <div className={styles["lobby-root"]}>
            <label className={styles["copy-label"]}>Copy room code</label>
            <div className={styles["room-code"]}>
                <button
                    onClick={copyCodeClickHandler}
                    className={styles["button-copy-code"]}
                >
                    {roomCode}
                </button>
            </div>
            <div className={styles["room-members"]}>
                {roomMembers.map(({ id, nickname, isReady }) => {
                    const hue =
                        id
                            .split("")
                            .reduce(
                                (sum, char) => sum + char.charCodeAt(0),
                                0
                            ) % 360;
                    const color = `hsl(${hue}, 60%, 50%)`;

                    return (
                        <div key={id} className={styles["member"]}>
                            <div
                                style={{
                                    backgroundColor: color,
                                    borderBottomColor: isReady
                                        ? "var(--color-ready)"
                                        : "transparent",
                                }}
                                className={styles["member-avatar"]}
                            />
                            <p>{nickname}</p>
                        </div>
                    );
                })}
            </div>
            <div className={styles["ready"]}>
                <button
                    onClick={readyClickHandler}
                    className={styles["button-ready"]}
                    disabled={isReadyClicked}
                >
                    Ready
                </button>
            </div>
        </div>
    );
}

export default Lobby;
