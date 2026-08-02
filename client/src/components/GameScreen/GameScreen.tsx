import styles from "./GameScreen.module.css";
import {
    type CardSuit,
    type Card,
    type DrawPileSize,
} from "../../../../shared/types";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import PlayingCard from "../PlayingCard/PlayingCard";
import { START_HAND_SIZE } from "../../../../shared/consts";
import {
    type RoundEndData,
    type ClientPlayer,
    type PromptType,
    type AuthUser,
} from "../../types";
import PlayerInfoCard from "../PlayerInfoCard/PlayerInfoCard";
import { useToast } from "../../hooks/useToast";
import PlayerHand from "../PlayerHand/PlayerHand";
import GamePrompt from "../GamePrompt/GamePrompt";
import BridgePrompt from "../GamePrompt/prompts/BridgePrompt";
import JackBonusPrompt from "../GamePrompt/prompts/JackBonusPrompt";
import SuitPrompt from "../GamePrompt/prompts/SuitPrompt";
import RoundEndPopup from "../RoundEndPopup/RoundEndPopup";
import GameAnnouncement from "../GameAnnouncement/GameAnnouncement";
import { buildEffectsMessage, getSuitSymbol } from "../../utils";

function GameScreen({ currentUser }: { currentUser: AuthUser }) {
    const [hand, setHand] = useState<Card[]>([]);
    const [activePileTopCard, setActivePileTopCard] = useState<Card | null>(
        null
    );
    const [dealerIndex, setDealerIndex] = useState<number>(-1);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(-2);
    const [players, setPlayers] = useState<ClientPlayer[]>([]);
    const [cardsToPlay, setCardsToPlay] = useState<Card[]>([]);
    const [activePrompt, setActivePrompt] = useState<PromptType>(null);
    const [jackSuit, setJackSuit] = useState<CardSuit | null>(null);
    const [announcement, setAnnouncement] = useState<string | null>(null);
    const [drawPileSize, setDrawPileSize] = useState<DrawPileSize>("medium");
    const [roundEndData, setRoundEndData] = useState<RoundEndData | null>(null);
    const socket = useSocket();
    const myIndex = players.findIndex((player) => player.id === currentUser.id);
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
            setDrawPileSize(data.drawPileSize);
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
            setJackSuit(null);
            const player = playersRef.current.find(
                (p) => p.id === data.playerId
            );
            if (!player) return;
            const cardsText = data.cardsPlayed
                .map((c) => `${c.rank}${getSuitSymbol(c.suit)}`)
                .join(" ");
            setAnnouncement(`${player.nickname} played: ${cardsText}`);
            setTimeout(() => setAnnouncement(null), 2000);
        });
        socket.on("card_drawn", (data) => {
            setPlayers((prev) =>
                prev.map((player) =>
                    player.id === data.playerId
                        ? { ...player, handCount: data.handCount }
                        : player
                )
            );
            setDrawPileSize(data.drawPileSize);
        });
        socket.on(
            "effects_applied",
            ({ specialEffects, affectedPlayerIndex }) => {
                const message = buildEffectsMessage(
                    playersRef.current[affectedPlayerIndex].nickname,
                    specialEffects
                );
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
        socket.on("suit_declared", ({ suit }) => {
            setJackSuit(suit);
        });
        socket.on("bridge_declared", () => {
            setAnnouncement(`Bridge declared!`);
            setTimeout(() => {
                setAnnouncement(null);
            }, 2000);
        });
        socket.on("score_reset", ({ playerIndex }) => {
            const name = playersRef.current[playerIndex].nickname;
            setAnnouncement(`${name} score got reset!`);
            setTimeout(() => {
                setAnnouncement(null);
            }, 2000);
        });
        socket.on("error", ({ error }) => {
            showToast({ level: "error", message: error });
        });
        socket.on(
            "pile_reshuffled",
            ({ drawPileSize, reshuffleMultiplier }) => {
                setAnnouncement(
                    `Draw pile reshuffled - X${reshuffleMultiplier}`
                );
                setDrawPileSize(drawPileSize);
            }
        );
        socket.on(
            "round_ended",
            ({
                winnerIndex,
                scores,
                eliminatedIndexes,
                reshuffleMultiplier,
            }) => {
                const winnerName = playersRef.current[winnerIndex].nickname;
                const eliminatedNames = eliminatedIndexes.map(
                    (index) => playersRef.current[index].nickname
                );
                const playerScores = scores.map((score, index) => ({
                    nickname: playersRef.current[index].nickname,
                    score,
                }));
                setRoundEndData({
                    winnerName,
                    eliminatedNames,
                    playerScores,
                    reshuffleMultiplier,
                });
            }
        );

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
            socket.off("suit_declared");
            socket.off("bridge_declared");
            socket.off("score_reset");
            socket.off("error");
            socket.off("pile_reshuffled");
            socket.off("round_ended");
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
            {roundEndData !== null && (
                <RoundEndPopup
                    onContinueClick={() => {
                        setRoundEndData(null);
                    }}
                    {...roundEndData}
                />
            )}
            {announcement !== null && <GameAnnouncement text={announcement} />}
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
                    {jackSuit !== null && <p>Jack suit: {jackSuit}</p>}
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
                    <div
                        className={[
                            styles["draw-pile"],
                            drawPileSize === "large" &&
                                styles["draw-pile-large"],
                            drawPileSize === "medium" &&
                                styles["draw-pile-medium"],
                            drawPileSize === "small" &&
                                styles["draw-pile-small"],
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
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
                <div
                    className={[
                        styles["game-actions"],
                        dealerIndex === myIndex && styles["player-dealer"],
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
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
