import styles from "./GameMenu.module.css";

function GameMenu() {
    return (
        <>
            <div>
                <button className={`${styles["button-create"]}`}>
                    Create game
                </button>
                <button>Join game</button>
            </div>
        </>
    );
}

export default GameMenu;
