import { useState, type ChangeEventHandler } from "react";
import styles from "./GameMenu.module.css";

function GameMenu() {
    const [nickname, setNickname] = useState<string>("");

    const handleInputChange: ChangeEventHandler<HTMLInputElement> = (event) => {
        setNickname(event.currentTarget.value);
    };

    return (
        <>
            <div>
                <input title="nickname" onChange={handleInputChange}></input>
                <button
                    disabled={nickname === ""}
                    className={`${styles["button-create"]}`}
                >
                    Create game
                </button>
                <button disabled={nickname === ""}>Join game</button>
            </div>
        </>
    );
}

export default GameMenu;
