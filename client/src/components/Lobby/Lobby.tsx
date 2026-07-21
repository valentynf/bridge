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
            <div className={styles["room-code"]}>
                <button
                    onClick={copyCodeClickHandler}
                    className={styles["copy-code"]}
                >
                    {roomCode}
                </button>
            </div>
            <div className={styles["room-members"]}>
                {roomMembers.map((member) => (
                    <div key={member.id} className={styles["member"]}>
                        <p>{member.nickname}</p>
                    </div>
                ))}
            </div>
            <div className={styles["ready"]}>
                <div></div>
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
