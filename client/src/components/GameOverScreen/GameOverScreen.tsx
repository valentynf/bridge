import styles from "./GameOverScreen.module.css";

function GameOverScreen({
    winnerName,
    finalPlayerScores,
    onBackToMenuClick,
}: {
    winnerName: string;
    finalPlayerScores: { nickname: string; score: number }[];
    onBackToMenuClick: () => void;
}) {
    return (
        <div className={styles["gameoverscreen-root"]}>
            <div className={styles["game-over-data"]}>
                <p>{winnerName}</p>
                {finalPlayerScores.map(({ nickname, score }, index) => (
                    <div key={index} className={styles["player-final-score"]}>
                        <p>{nickname}:</p>
                        <p>{score}</p>
                    </div>
                ))}
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
