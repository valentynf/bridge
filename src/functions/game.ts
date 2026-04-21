import { PLAYER_CARD_NUMBER } from "../consts.js";
import type { Card, CardSuit, SpecialEffect } from "../types.js";
import { shuffleDeck } from "./deck.js";

export const dealCards = (
    dealerIndex: number,
    numberOfPlayers: number,
    shuffledDeck: Card[]
): { hands: Card[][]; drawPile: Card[]; activePile: Card[] } => {
    const hands: Card[][] = new Array(numberOfPlayers)
        .fill(undefined)
        .map(() => []);
    const cardsToDeal = [...shuffledDeck];
    let i = 0;

    while (i < PLAYER_CARD_NUMBER) {
        for (const hand of hands) {
            const dealingCard = cardsToDeal.shift();
            if (dealingCard) hand.push(dealingCard);
        }
        i++;
    }

    const dealerFifthCard = hands[dealerIndex].pop();
    const activePile: Card[] = [];

    if (dealerFifthCard) activePile.push(dealerFifthCard);

    const drawPile: Card[] = [...cardsToDeal];

    return { hands, drawPile, activePile };
};

export const applyPendingEffects = (
    drawPile: Card[],
    activePile: Card[],
    playerHand: Card[],
    pendingEffects: SpecialEffect[]
): {
    updatedDrawPile: Card[];
    updatedHand: Card[];
    updatedActivePile: Card[];
    skipTurn: boolean;
    reshuffled: boolean;
} => {
    const updatedHand = [...playerHand];
    let updatedDrawPile = [...drawPile];
    let updatedActivePile = [...activePile];
    let skipTurn = false;
    let reshuffled = false;
    for (const effect of pendingEffects) {
        if (effect === "TAKE_CARD") {
            const topDrawPileCard = updatedDrawPile.shift();
            if (topDrawPileCard) {
                updatedHand.push(topDrawPileCard);
            } else {
                // if (!reshuffled), implement scenario with empty deck (only 1 card on the table)
                const topActivePileCard = updatedActivePile.shift();
                updatedDrawPile = shuffleDeck(updatedActivePile);
                const topDrawPileCard = updatedDrawPile.shift();
                if (topActivePileCard) updatedActivePile = [topActivePileCard];
                if (topDrawPileCard) updatedHand.push(topDrawPileCard);
                reshuffled = true;
            }
        }
        if (effect === "SKIP_TURN") skipTurn = true;
    }

    return {
        updatedDrawPile,
        updatedHand,
        updatedActivePile,
        skipTurn,
        reshuffled,
    };
};

export const checkCanPlay = (
    activePileTopCard: Card,
    playerHand: Card[],
    jackSuit: CardSuit
): boolean => {
    if (playerHand.some((card) => card.rank === "J")) return true;
    for (const card of playerHand) {
        if (
            (card.rank === activePileTopCard.rank ||
                card.suit === activePileTopCard.suit) &&
            activePileTopCard.rank !== "J"
        )
            return true;
        if (activePileTopCard.rank === "J" && card.suit === jackSuit)
            return true;
    }
    return false;
};

export const playCards = (
    playersHand: Card[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cardsToPlay: Card[],
    activePile: Card[],
    drawPile: Card[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    jackSuit: CardSuit
): {
    updatedHand: Card[];
    updatedActivePile: Card[];
    updatedDrawPile: Card[];
    specialEffects: SpecialEffect[];
    reshuffled: boolean;
} => {
    const updatedHand = [...playersHand];
    const updatedActivePile = [...activePile];
    const updatedDrawPile = [...drawPile];
    const specialEffects: SpecialEffect[] = [];
    return {
        updatedHand,
        updatedActivePile,
        updatedDrawPile,
        specialEffects,
        reshuffled: false,
    };
};
