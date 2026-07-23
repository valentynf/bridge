import styles from "./GameScreen.module.css";

function GameScreen() {
    return (
        <div className={styles["gamescreen-root"]}>
            <div className={styles["gamescreen-top"]}>
                <div className={styles["opponent-container-top"]}>
                    {
                        //if players length 4, render 4th player here, if two, second, if three - none
                    }
                </div>
            </div>
            <div className={styles["gamescreen-center"]}>
                <div className={styles["opponent-container-left"]}></div>
                <div className={styles["deck-container"]}>
                    <div className={styles["draw-pile"]}></div>
                    <div className={styles["active-pile"]}></div>
                </div>
                <div className={styles["opponent-container-right"]}></div>
            </div>
            <div className={styles["gamescreen-bottom"]}>
                <div className={styles["player-hand"]}></div>
                <div className={styles["game-actions"]}>
                    <button>Play cards</button>
                    <button>Draw card</button>
                    <button>End Turn</button>
                </div>
            </div>
        </div>
    );
}

export default GameScreen;
