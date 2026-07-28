import type { RoundEndData } from "../../types";
import styles from "./RoundEndPopup.module.css";

function RoundEndPopup({
    winnerName,
    playerScores,
    eliminatedNames,
    reshuffleMultiplier,
    onContinueClick,
}: RoundEndData & { onContinueClick: () => void }) {
    return (
        <div className={styles["roundend-popup-root"]}>
            <div className={styles["roundend-popup"]}>
                <h2 className={styles["popup-heading"]}> Round end info </h2>
                <p className={styles["winner-text"]}>
                    {winnerName} won the round!
                </p>
                {eliminatedNames.length > 0 &&
                    eliminatedNames.map((name, index) => (
                        <p className={styles["eliminated-text"]} key={index}>
                            {name} has been eliminated!
                        </p>
                    ))}
                {reshuffleMultiplier > 1 && (
                    <p className={styles["reshuffle-text"]}>
                        Reshuffle multiplier is X{reshuffleMultiplier}
                    </p>
                )}
                <div className={styles["scores"]}>
                    {[...playerScores]
                        .sort((a, b) => a.score - b.score)
                        .map(({ nickname, score }, index) => (
                            <div
                                key={index + nickname}
                                className={styles["player-score"]}
                            >
                                <p>{nickname}</p>
                                <p>{score}</p>
                            </div>
                        ))}
                </div>

                <button
                    onClick={onContinueClick}
                    className={styles["button-continue"]}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

export default RoundEndPopup;
