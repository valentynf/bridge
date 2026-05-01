import { describe, expect, test } from "vitest";
import {
    countHandPoints,
    createNewDeck,
    dealCards,
    shuffleDeck,
} from "../functions/deck.js";
import {
    CARD_SUITS,
    CARD_RANKS,
    DECK_SIZE,
    START_ACTIVE_PILE_SIZE,
    PLAYER_CARD_NUMBER,
    DEALER_CARD_NUMBER,
    CUSTOM_DEALER_INDEX,
    DEFAULT_PLAYERS_NUMBER,
    DEFAULT_DEALER_INDEX,
} from "../consts.js";
import type { Card } from "../types.js";

describe("newDeck", () => {
    const deck = createNewDeck();

    test("Should have 36 cards", () => {
        expect(deck.length).toBe(DECK_SIZE);
    });

    test("Should have 4 of each rank", () => {
        const cardsPerRank = DECK_SIZE / CARD_RANKS.length;
        const deckRanks = deck.map((card) => card.rank);
        for (const rank of CARD_RANKS) {
            const singleRankCards = deckRanks.filter(
                (deckRank) => deckRank === rank
            );
            expect(singleRankCards.length).toBe(cardsPerRank);
        }
    });

    test("Should have 9 of each suit", () => {
        const cardsPerSuit = DECK_SIZE / CARD_SUITS.length;
        const deckSuits = deck.map((card) => card.suit);
        for (const suit of CARD_SUITS) {
            const singleSuitCards = deckSuits.filter(
                (deckSuit) => deckSuit === suit
            );
            expect(singleSuitCards.length).toBe(cardsPerSuit);
        }
    });
});

describe("shuffleDeck", () => {
    const unshuffledDeck = createNewDeck();
    const shuffledDeck = shuffleDeck(unshuffledDeck);

    test("Should have same size", () => {
        expect(shuffledDeck.length).toBe(unshuffledDeck.length);
    });

    test("Should have same cards", () => {
        const sortedUnshuffledDeck = [...unshuffledDeck]
            .map((card) => card.rank + card.suit)
            .sort((a, b) => a.localeCompare(b));
        const sortedShuffledDeck = [...shuffledDeck]
            .map((card) => card.rank + card.suit)
            .sort((a, b) => a.localeCompare(b));
        expect(sortedUnshuffledDeck).toEqual(sortedShuffledDeck);
    });
});

describe("dealHands", () => {
    const shuffledDeck = shuffleDeck(createNewDeck());
    const dealtCardsDefault = dealCards(
        DEFAULT_DEALER_INDEX,
        DEFAULT_PLAYERS_NUMBER,
        shuffledDeck
    );

    test("Dealer should have 4 cards, others 5 (dealer 0)", () => {
        const dealtHands = dealtCardsDefault.hands;
        for (let i = 0; i < dealtHands.length; i++) {
            if (i === DEFAULT_DEALER_INDEX) {
                expect(dealtHands[i].length).toBe(DEALER_CARD_NUMBER);
            } else {
                expect(dealtHands[i].length).toBe(PLAYER_CARD_NUMBER);
            }
        }
    });

    test("Dealer should have 4 cards, others 5 (dealer 2)", () => {
        const dealtCards = dealCards(
            CUSTOM_DEALER_INDEX,
            DEFAULT_PLAYERS_NUMBER,
            shuffledDeck
        );
        const dealtHands = dealtCards.hands;
        for (let i = 0; i < dealtHands.length; i++) {
            if (i === CUSTOM_DEALER_INDEX) {
                expect(dealtHands[i].length).toBe(DEALER_CARD_NUMBER);
            } else {
                expect(dealtHands[i].length).toBe(PLAYER_CARD_NUMBER);
            }
        }
    });

    test("Active pile should have 1 card", () => {
        expect(dealtCardsDefault.activePile.length).toBe(
            START_ACTIVE_PILE_SIZE
        );
    });

    test("Should be a total of 36 cards", () => {
        const cardsOnHandsNum = dealtCardsDefault.hands.reduce(
            (res, hand) => res + hand.length,
            0
        );
        const cardsDrawPileNum = dealtCardsDefault.drawPile.length;
        expect(
            cardsOnHandsNum + cardsDrawPileNum + START_ACTIVE_PILE_SIZE
        ).toBe(DECK_SIZE);
    });
});

describe("countPoints", () => {
    test("Should be 0 points", () => {
        const numbersOnlyHand: Card[] = [
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
            { rank: "6", suit: "clubs" },
        ];
        expect(countHandPoints(numbersOnlyHand)).toBe(0);
    });
    test("Should be 30 points", () => {
        const handOfTens: Card[] = [
            { rank: "K", suit: "spades" },
            { rank: "Q", suit: "spades" },
            { rank: "10", suit: "clubs" },
            { rank: "8", suit: "clubs" },
        ];
        expect(countHandPoints(handOfTens)).toBe(30);
    });
    test("Should be 40 points", () => {
        const twoJacksHand: Card[] = [
            { rank: "J", suit: "clubs" },
            { rank: "J", suit: "diamonds" },
            { rank: "9", suit: "spades" },
        ];
        expect(countHandPoints(twoJacksHand)).toBe(40);
    });
    test("Should be 45 points", () => {
        const threeAcesHand: Card[] = [
            { rank: "A", suit: "spades" },
            { rank: "A", suit: "clubs" },
            { rank: "A", suit: "hearts" },
            { rank: "6", suit: "clubs" },
        ];
        expect(countHandPoints(threeAcesHand)).toBe(45);
    });
    test("Should be 65 points", () => {
        const mixedHand: Card[] = [
            { rank: "A", suit: "spades" },
            { rank: "J", suit: "clubs" },
            { rank: "10", suit: "hearts" },
            { rank: "Q", suit: "hearts" },
            { rank: "K", suit: "hearts" },
            { rank: "6", suit: "clubs" },
        ];
        expect(countHandPoints(mixedHand)).toBe(65);
    });
});
