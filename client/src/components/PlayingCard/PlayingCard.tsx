import type { Card } from "../../../../shared/types";
import { getSuitSymbol } from "../../utils";
import styles from "./PlayingCard.module.css";

type CardProps =
    | {
          faceUp: true;
          rank: Card["rank"];
          suit: Card["suit"];
          size?: never;
      }
    | { faceUp: false; rank?: never; suit?: never; size?: "small" | "normal" };

function PlayingCard({ rank, suit, faceUp, size }: CardProps) {
    const cardColor: string = `var(--color-card-${
        suit === "clubs" || suit === "spades" ? "black" : "red"
    })`;

    return (
        <div
            className={[
                styles["card-root"],
                size === "small" && styles["card-small"],
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {faceUp ? (
                <div className={styles["card-front"]}>
                    <div className={styles["front-card-top"]}>
                        <p
                            className={styles["card-text"]}
                            style={{ color: cardColor }}
                        >{`${rank} ${getSuitSymbol(suit)}`}</p>
                    </div>
                    <div className={styles["front-card-bottom"]}>
                        <p
                            className={styles["card-text"]}
                            style={{ color: cardColor }}
                        >{`${rank} ${getSuitSymbol(suit)}`}</p>
                    </div>
                </div>
            ) : (
                <div
                    className={[
                        styles["card-back"],
                        size === "small" && styles["card-back-small"],
                    ]
                        .filter(Boolean)
                        .join(" ")}
                />
            )}
        </div>
    );
}

export default PlayingCard;
