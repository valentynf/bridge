import type { ReactNode } from "react";
import styles from "./GamePrompt.module.css";

function GamePrompt({ children }: { children: ReactNode }) {
    return (
        <div className={styles["game-prompt-root"]}>
            <div className={styles["prompt"]}>{children}</div>
        </div>
    );
}

export default GamePrompt;
