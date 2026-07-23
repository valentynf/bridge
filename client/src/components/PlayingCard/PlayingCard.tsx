import type { Card } from "../../../../shared/types";
import styles from "./PlayingCard.module.css";

type CardProps =
    | { faceUp: true; rank: Card["rank"]; suit: Card["suit"] }
    | { faceUp: false; rank?: never; suit?: never };

const suitSymbols = { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" };

function PlayingCard({ rank, suit, faceUp }: CardProps) {
    const cardColor: string = `var(--color-card-${
        suit === "clubs" || suit === "spades" ? "black" : "red"
    })`;

    return (
        <div className={styles["card-root"]}>
            {faceUp ? (
                <div className={styles["card-front"]}>
                    <div className={styles["front-card-top"]}>
                        <p
                            className={styles["card-text"]}
                            style={{ color: cardColor }}
                        >{`${rank} ${suitSymbols[suit]}`}</p>
                    </div>
                    <div className={styles["front-card-bottom"]}>
                        <p
                            className={styles["card-text"]}
                            style={{ color: cardColor }}
                        >{`${rank} ${suitSymbols[suit]}`}</p>
                    </div>
                </div>
            ) : (
                <div className={styles["card-back"]} />
            )}
        </div>
    );
}

export default PlayingCard;
