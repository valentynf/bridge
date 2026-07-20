import type { LobbyMember } from "../../../../shared/types";
import styles from "./Lobby.module.css";

type LobbyProps = {
    roomMembers: LobbyMember[];
    roomCode: string;
};

function Lobby({ roomMembers, roomCode }: LobbyProps) {
    return (
        <div className={styles["lobby-root"]}>
            <div className={styles["room-code"]}>
                <button className={styles["copy-code"]}>{roomCode}</button>
            </div>
            <div className={styles["room-members"]}>
                {roomMembers.map((member) => (
                    <div key={member.id} className={styles["member"]}>
                        <p>{member.nickname}</p>
                    </div>
                ))}
            </div>
            <div className={styles["ready"]}>
                <button className={styles["button-ready"]}>Ready</button>
            </div>
        </div>
    );
}

export default Lobby;
