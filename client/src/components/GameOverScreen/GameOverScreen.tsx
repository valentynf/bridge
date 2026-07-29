import type { GameEndData } from "../../types";
import styles from "./GameOverScreen.module.css";

function GameOverScreen({
    winnerName,
    finalPlayerScores,
    onBackToMenuClick,
}: GameEndData & { onBackToMenuClick: () => void }) {
    return (
        <div className={styles["game-over-screen-root"]}>
            <div className={styles["game-over-data"]}>
                <div className={styles["winner-info"]}>
                    <p>The winner is</p>
                    <p>{winnerName}</p>
                </div>
                <div className={styles["final-score"]}>
                    {finalPlayerScores.map(({ nickname, score }, index) => (
                        <div
                            key={index}
                            className={styles["player-final-score"]}
                        >
                            <p>{nickname}</p>
                            <p>{score}</p>
                        </div>
                    ))}
                </div>
            </div>
            <button
                onClick={onBackToMenuClick}
                className={styles["button-back-to-menu"]}
            >
                Back to Menu
            </button>
        </div>
    );
}

export default GameOverScreen;
