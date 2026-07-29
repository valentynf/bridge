import type { ClientPlayer } from "../../types";
import { getColorFromString } from "../../utils";
import PlayingCard from "../PlayingCard/PlayingCard";
import styles from "./PlayerInfoCard.module.css";

function PlayerInfoCard({
    id,
    nickname,
    score,
    handCount,
    isDealer,
    isCurrentPlayer,
}: ClientPlayer & { isCurrentPlayer: boolean; isDealer: boolean }) {
    return (
        <div className={styles["opponent-infocard-root"]}>
            <div
                className={[
                    styles["opponent-info-container"],
                    isDealer && styles["dealer"],
                    isCurrentPlayer && styles["current-player"],
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                <div
                    style={{
                        backgroundColor: getColorFromString(id),
                    }}
                    className={styles["opponent-avatar"]}
                ></div>
                <div className={styles["opponent-info"]}>
                    <p className={styles["opponent-nickname"]}>{nickname}</p>
                    <p className={styles["opponent-score"]}>score: {score}</p>
                </div>
            </div>
            <div className={styles["opponent-hand"]}>
                {Array.from({ length: handCount }).map((_, index) => (
                    <PlayingCard key={index} faceUp={false} size="small" />
                ))}
            </div>
        </div>
    );
}

export default PlayerInfoCard;
