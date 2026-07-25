import { useState } from "react";
import type { LobbyMember } from "../../../../shared/types";
import styles from "./Lobby.module.css";
import { useSocket } from "../../hooks/useSocket";
import { useToast } from "../../hooks/useToast";
import { getColorFromString } from "../../utils";

type LobbyProps = {
    roomMembers: LobbyMember[];
    roomCode: string;
};

function Lobby({ roomMembers, roomCode }: LobbyProps) {
    const socket = useSocket();
    const showToast = useToast();
    const [isReadyClicked, setIsReadyClicked] = useState<boolean>(false);

    const readyClickHandler = () => {
        socket.emit("player_ready");
        setIsReadyClicked(true);
    };

    const copyCodeClickHandler = () => {
        navigator.clipboard.writeText(roomCode);
        showToast({ message: "Copied to clipboard!", level: "success" });
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
                    return (
                        <div key={id} className={styles["member"]}>
                            <div
                                style={{
                                    backgroundColor: getColorFromString(id),
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
