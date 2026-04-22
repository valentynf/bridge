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
    jackSuit?: CardSuit
): boolean => {
    if (playerHand.some((card) => card.rank === "J")) return true;
    for (const card of playerHand) {
        if (
            (card.rank === activePileTopCard.rank ||
                card.suit === activePileTopCard.suit) &&
            activePileTopCard.rank !== "J"
        )
            return true;
        if (
            jackSuit &&
            activePileTopCard.rank === "J" &&
            card.suit === jackSuit
        )
            return true;
    }
    return false;
};

export const playCards = (
    playersHand: Card[],
    cardsToPlay: Card[],
    activePile: Card[],
    drawPile: Card[],
    jackSuit: CardSuit
): {
    updatedHand: Card[];
    updatedActivePile: Card[];
    updatedDrawPile: Card[];
    specialEffects: SpecialEffect[];
    reshuffled: boolean;
} => {
    const activePileTopCard = activePile[0];
    let updatedHand: Card[] = [...playersHand];
    const updatedActivePile: Card[] = [...activePile];
    const updatedDrawPile: Card[] = [...drawPile];
    const specialEffects: SpecialEffect[] = [];
    const reshuffled: boolean = false;

    const unchangedData = {
        updatedHand: playersHand,
        updatedActivePile: activePile,
        updatedDrawPile: drawPile,
        specialEffects,
        reshuffled,
    };

    if (cardsToPlay.length === 1) {
        if (activePileTopCard.rank === "J") {
            if (!checkCanPlay(activePileTopCard, cardsToPlay, jackSuit))
                return unchangedData;
        } else if (!checkCanPlay(activePileTopCard, cardsToPlay))
            return unchangedData;

        //todo
        // if (cardsToPlay[0].rank === "6") {
        // }
        if (
            (activePileTopCard.rank === "J" &&
                cardsToPlay[0].suit === jackSuit) ||
            cardsToPlay[0].rank === activePileTopCard.rank ||
            cardsToPlay[0].suit === activePileTopCard.suit
        ) {
            updatedHand = updatedHand.filter(
                (card) =>
                    !(
                        card.rank === cardsToPlay[0].rank &&
                        card.suit === cardsToPlay[0].suit
                    )
            );
            updatedActivePile.unshift(cardsToPlay[0]);
        }
    }

    for (const card of cardsToPlay) {
        if (card.rank === "7") specialEffects.push("TAKE_CARD");
        if (card.rank === "8")
            specialEffects.push("TAKE_CARD", "TAKE_CARD", "SKIP_TURN");
        if (card.rank === "A") specialEffects.push("SKIP_TURN");
    }

    return {
        updatedHand,
        updatedActivePile,
        updatedDrawPile,
        specialEffects,
        reshuffled,
    };
};
