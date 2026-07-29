import styles from "./GameAnnouncement.module.css";

function GameAnnouncement({ text }: { text: string }) {
    return (
        <div className={styles["game-announcement-root"]}>
            <div className={styles["announcement"]}>
                <p className={styles["announcement-text"]}>{text}</p>
            </div>
        </div>
    );
}

export default GameAnnouncement;
