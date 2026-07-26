import PlayingCard from "../PlayingCard/PlayingCard";
import styles from "./PlayerHand.module.css";
import type { Card } from "../../../../shared/types";

type PlayerHandProps = {
    hand: Card[];
    cardsToPlay: Card[];
    onCardClick: (card: Card) => void;
};

function PlayerHand({ hand, cardsToPlay, onCardClick }: PlayerHandProps) {
    return (
        <div className={styles["player-hand-root"]}>
            {hand.map(({ rank, suit }) => {
                const cardToPlayIndex = cardsToPlay.findIndex(
                    (card) => card.rank === rank && card.suit === suit
                );

                return (
                    <div
                        className={[
                            styles["card-wrapper"],
                            cardToPlayIndex !== -1 && styles["selected-card"],
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        key={rank + suit}
                        onClick={() => onCardClick({ rank, suit })}
                    >
                        {cardToPlayIndex !== -1 && (
                            <span>{cardToPlayIndex + 1}</span>
                        )}
                        <PlayingCard faceUp={true} suit={suit} rank={rank} />
                    </div>
                );
            })}
        </div>
    );
}

export default PlayerHand;
