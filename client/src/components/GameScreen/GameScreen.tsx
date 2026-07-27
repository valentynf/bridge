import styles from "./GameScreen.module.css";
import type { Card } from "../../../../shared/types";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import PlayingCard from "../PlayingCard/PlayingCard";
import { START_HAND_SIZE } from "../../../../shared/consts";
import type { ClientPlayer, PromptType } from "../../types";
import PlayerInfoCard from "../PlayerInfoCard/PlayerInfoCard";
import { useToast } from "../../hooks/useToast";
import PlayerHand from "../PlayerHand/PlayerHand";
import GamePrompt from "../GamePrompt/GamePrompt";
import BridgePrompt from "../GamePrompt/prompts/BridgePrompt";
import JackBonusPrompt from "../GamePrompt/prompts/JackBonusPrompt";
import SuitPrompt from "../GamePrompt/prompts/SuitPrompt";

function GameScreen() {
    const [hand, setHand] = useState<Card[]>([
        { rank: "7", suit: "hearts" },
        { rank: "Q", suit: "spades" },
        { rank: "A", suit: "clubs" },
        { rank: "10", suit: "diamonds" },
        { rank: "8", suit: "hearts" },
        { rank: "J", suit: "clubs" },
        { rank: "6", suit: "spades" },
    ]);
    const [activePileTopCard, setActivePileTopCard] = useState<Card | null>({
        rank: "K",
        suit: "hearts",
    });
    const [dealerIndex, setDealerIndex] = useState<number>(3);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
    const [players, setPlayers] = useState<ClientPlayer[]>([
        { id: "socket01abc", nickname: "valentyn", score: 0, handCount: 7 },
        { id: "socket02def", nickname: "player2nd", score: 15, handCount: 5 },
        { id: "socket03ghi", nickname: "player3rd", score: 40, handCount: 3 },
        { id: "socket04jkl", nickname: "player4th", score: 80, handCount: 6 },
    ]);
    const [cardsToPlay, setCardsToPlay] = useState<Card[]>([]);
    const [activePrompt, setActivePrompt] = useState<PromptType>(null);
    // const [hand, setHand] = useState<Card[]>([]);
    // const [activePileTopCard, setActivePileTopCard] = useState<Card | null>(
    //     null
    // );
    // const [dealerIndex, setDealerIndex] = useState<number>(-1);
    // const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(-2);
    // const [players, setPlayers] = useState<ClientPlayer[]>([]);
    const socket = useSocket();
    // const myIndex = players.findIndex((player) => player.id === socket.id);
    const myIndex = 0;
    const seatMap = {
        left: (myIndex + 1) % players.length,
        top: (myIndex + 2) % players.length,
        right: (myIndex + 3) % players.length,
    };
    const showToast = useToast();
    const playersRef = useRef<ClientPlayer[]>(players);

    useEffect(() => {
        playersRef.current = players;
    }, [players]);

    useEffect(() => {
        socket.on("round_started", (data) => {
            setHand(data.hand);
            setActivePileTopCard(data.activePileTopCard);
            setDealerIndex(data.dealerIndex);
            setCurrentPlayerIndex(data.currentPlayerIndex);
            setPlayers(
                data.players.map((player) => ({
                    ...player,
                    handCount: START_HAND_SIZE,
                }))
            );
        });
        socket.on("turn_started", (data) => {
            setCurrentPlayerIndex(data.currentPlayerIndex);
        });
        socket.on("hand_update", (data) => {
            setHand(data.updatedHand);
        });
        socket.on("cards_played", (data) => {
            setActivePileTopCard(data.activePileTopCard);
            setPlayers((prev) =>
                prev.map((player) =>
                    player.id === data.playerId
                        ? { ...player, handCount: data.handCount }
                        : player
                )
            );
        });
        socket.on("card_drawn", (data) => {
            setPlayers((prev) =>
                prev.map((player) =>
                    player.id === data.playerId
                        ? { ...player, handCount: data.handCount }
                        : player
                )
            );
        });
        socket.on(
            "effects_applied",
            ({ specialEffects, affectedPlayerIndex }) => {
                const specialEffectsString = specialEffects.join(",");
                const message = `${playersRef.current[affectedPlayerIndex].nickname} has suffered these effects: ${specialEffectsString}`;
                showToast({ level: "warning", message });
            }
        );
        socket.on("set_jack_suit", () => {
            setActivePrompt("suit_pick");
        });
        socket.on("can_bridge", () => {
            setActivePrompt("bridge");
        });
        socket.on("choose_jack_bonus", () => {
            setActivePrompt("jack_bonus");
        });

        return () => {
            socket.off("round_started");
            socket.off("turn_started");
            socket.off("hand_update");
            socket.off("cards_played");
            socket.off("card_drawn");
            socket.off("effects_applied");
            socket.off("set_jack_suit");
            socket.off("can_bridge");
            socket.off("choose_jack_bonus");
        };
    }, [socket, showToast]);

    const handleEndTurnClick = () => {
        socket.emit("end_turn");
    };

    const handleDrawCardClick = () => {
        socket.emit("draw_card");
    };

    const handlePlayCardsClick = () => {
        socket.emit("play_cards", { cardsToPlay });
        setCardsToPlay([]);
    };

    const handleCardClick = (card: Card) => {
        const cardToPlayIndex = cardsToPlay.findIndex(
            (cardToPlay) =>
                cardToPlay.rank === card.rank && cardToPlay.suit === card.suit
        );
        if (cardToPlayIndex === -1) {
            setCardsToPlay((prev) => [card, ...prev]);
        } else {
            setCardsToPlay((prev) =>
                prev.filter((_, index) => index !== cardToPlayIndex)
            );
        }
    };

    return (
        <div className={styles["gamescreen-root"]}>
            {activePrompt === "bridge" && (
                <GamePrompt>
                    <BridgePrompt
                        onClickSkipBridge={() => {
                            setActivePrompt(null);
                        }}
                        onClickDeclareBridge={() => {
                            socket.emit("declare_bridge");
                            setActivePrompt(null);
                        }}
                    />
                </GamePrompt>
            )}
            {activePrompt === "jack_bonus" && (
                <GamePrompt>
                    <JackBonusPrompt
                        onClickDouble={() => {
                            socket.emit("declare_jack_bonus", {
                                option: "DOUBLE_ALL",
                            });
                            setActivePrompt(null);
                        }}
                        onClickMinus20={() => {
                            socket.emit("declare_jack_bonus", {
                                option: "MINUS_20",
                            });
                            setActivePrompt(null);
                        }}
                    />
                </GamePrompt>
            )}
            {activePrompt === "suit_pick" && (
                <GamePrompt>
                    <SuitPrompt
                        onClickClubs={() => {
                            socket.emit("declare_suit", { suit: "clubs" });
                            setActivePrompt(null);
                        }}
                        onClickDiamonds={() => {
                            socket.emit("declare_suit", { suit: "diamonds" });
                            setActivePrompt(null);
                        }}
                        onClickHearts={() => {
                            socket.emit("declare_suit", { suit: "hearts" });
                            setActivePrompt(null);
                        }}
                        onClickSpades={() => {
                            socket.emit("declare_suit", { suit: "spades" });
                            setActivePrompt(null);
                        }}
                    />
                </GamePrompt>
            )}
            <div className={styles["gamescreen-top"]}>
                <div className={styles["opponent-container-top"]}>
                    {players.length >= 3 && (
                        <PlayerInfoCard
                            isDealer={dealerIndex === seatMap.top}
                            isCurrentPlayer={currentPlayerIndex === seatMap.top}
                            {...players[seatMap.top]}
                        />
                    )}
                </div>
            </div>
            <div className={styles["gamescreen-center"]}>
                <div className={styles["opponent-container-left"]}>
                    {players.length >= 2 && (
                        <PlayerInfoCard
                            isDealer={dealerIndex === seatMap.left}
                            isCurrentPlayer={
                                currentPlayerIndex === seatMap.left
                            }
                            {...players[seatMap.left]}
                        />
                    )}
                </div>
                <div className={styles["deck-container"]}>
                    <div className={styles["active-pile"]}>
                        {activePileTopCard === null ? (
                            <PlayingCard faceUp={false} />
                        ) : (
                            <PlayingCard
                                faceUp={true}
                                rank={activePileTopCard.rank}
                                suit={activePileTopCard.suit}
                            />
                        )}
                    </div>
                    <div className={styles["draw-pile"]}>
                        <PlayingCard faceUp={false} />
                    </div>
                </div>
                <div className={styles["opponent-container-right"]}>
                    {players.length >= 4 && (
                        <PlayerInfoCard
                            isDealer={dealerIndex === seatMap.right}
                            isCurrentPlayer={
                                currentPlayerIndex === seatMap.right
                            }
                            {...players[seatMap.right]}
                        />
                    )}
                </div>
            </div>
            <div className={styles["gamescreen-bottom"]}>
                <PlayerHand
                    hand={hand}
                    cardsToPlay={cardsToPlay}
                    onCardClick={handleCardClick}
                />
                <div className={styles["game-actions"]}>
                    <button
                        className={styles["button-play-cards"]}
                        disabled={currentPlayerIndex !== myIndex}
                        onClick={handlePlayCardsClick}
                    >
                        Play cards
                    </button>
                    <button
                        className={styles["button-draw-card"]}
                        disabled={currentPlayerIndex !== myIndex}
                        onClick={handleDrawCardClick}
                    >
                        Draw card
                    </button>
                    <button
                        className={styles["button-end-turn"]}
                        disabled={currentPlayerIndex !== myIndex}
                        onClick={handleEndTurnClick}
                    >
                        End turn
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GameScreen;
