import type { Card } from "../../../shared/types.js";
import {
    CARD_POINTS,
    CARD_RANKS,
    CARD_SUITS,
    PLAYER_CARD_NUMBER,
} from "../../../shared/consts.js";

export const createNewDeck = (): Card[] => {
    const newDeck: Card[] = [];
    for (const rank of CARD_RANKS) {
        for (const suit of CARD_SUITS) {
            newDeck.push({ rank, suit });
        }
    }
    return newDeck;
};

export const shuffleDeck = (unshuffledDeck: Card[]): Card[] => {
    const shuffledDeck = [...unshuffledDeck];
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    return shuffledDeck;
};

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

export const countHandPoints = (playerHand: Card[]): number =>
    playerHand.reduce((score, card) => {
        score += CARD_POINTS[card.rank];
        return score;
    }, 0);
