import type { RoundEndData } from "../../types";
import styles from "./RoundEndPopup.module.css";

function RoundEndPopup({
    winnerName,
    playerScores,
    eliminatedNames,
    reshuffleMultiplier,
}: RoundEndData) {
    return (
        <div className={styles["roundend-popup-root"]}>
            <div className={styles["roundend-popup"]}>
                <h2 className={styles["popup-heading"]}> Round end info </h2>
                <p className={styles["winner-text"]}>
                    {winnerName} won the round!
                </p>
                {reshuffleMultiplier > 1 && (
                    <p>Reshuffle multiplier is X{reshuffleMultiplier}</p>
                )}
                {playerScores.map(({ nickname, score }, index) => (
                    <div key={index} className={styles["player-score"]}>
                        <p>{nickname}:</p>
                        <p>{score}</p>
                    </div>
                ))}
                {eliminatedNames.length > 0 &&
                    eliminatedNames.map((name, index) => (
                        <p key={index}>{name} has been eliminated!</p>
                    ))}
            </div>
        </div>
    );
}

export default RoundEndPopup;
