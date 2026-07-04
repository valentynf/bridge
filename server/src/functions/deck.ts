import type { Card } from "../../../shared/types.js";
import {
    CARD_POINTS,
    CARD_RANKS,
    CARD_SUITS,
    DECK_SIZE,
    START_HAND_SIZE,
} from "../../../shared/consts.js";
import { areSameCards } from "./utility.js";

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

export const reshuffleDeck = (
    activePile: Card[]
): { updatedActivePile: Card[]; updatedDrawPile: Card[] } => {
    let updatedActivePile = [...activePile];
    const activePileTopCard = updatedActivePile.shift();
    if (!activePileTopCard) {
        return { updatedActivePile: activePile, updatedDrawPile: [] };
    }
    const updatedDrawPile = shuffleDeck([...updatedActivePile]);
    updatedActivePile = [activePileTopCard];
    return { updatedActivePile, updatedDrawPile };
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

    while (i < START_HAND_SIZE) {
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

export const reverseDealCards = (
    hands: Card[][],
    drawPile?: Card[]
): Card[] => {
    const predictableDeck: Card[] = new Array(DECK_SIZE);
    const freshDeck: Card[] = createNewDeck();
    const playersNumber = hands.length;
    for (let i = 0; i < START_HAND_SIZE; i++) {
        for (let j = 0; j < playersNumber; j++)
            predictableDeck[i * playersNumber + j] = hands[j][i];
    }
    if (drawPile) {
        const drawPileStartIndex = START_HAND_SIZE * playersNumber;
        for (let i = 0; i < drawPile.length; i++) {
            predictableDeck[drawPileStartIndex + i] = drawPile[i];
        }
    }
    const leftoverCards: Card[] = freshDeck.filter(
        (freshCard) =>
            !predictableDeck.some((card) => {
                if (!card) return false;
                return areSameCards(card, freshCard);
            })
    );
    for (let i = 0; i < DECK_SIZE; i++) {
        if (!predictableDeck[i] && leftoverCards.length > 0) {
            predictableDeck[i] = leftoverCards.pop()!;
        }
    }
    return predictableDeck;
};

export const countHandPoints = (playerHand: Card[]): number =>
    playerHand.reduce((score, card) => {
        score += CARD_POINTS[card.rank];
        return score;
    }, 0);
