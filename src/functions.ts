import type { Card } from "./types.js";
import { CARD_RANKS, CARD_SUITS } from "./consts.js";

export const newDeck = (): Card[] => {
    const newDeck: Card[] = [];
    for (const rank of CARD_RANKS) {
        for (const suit of CARD_SUITS) {
            newDeck.push({ rank, suit });
        }
    }
    return newDeck;
};

export const shuffleDeck = (unshuffledDeck: Card[]): Card[] => {
    const shuffledDeck = unshuffledDeck;
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    return shuffledDeck;
};
