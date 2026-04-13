import { describe, expect, test } from "vitest";
import { newDeck, shuffleDeck } from "../functions/deck.js";
import { dealCards } from "../functions/game.js";
import {
    DEALER_CARD_NUMBER,
    PLAYER_CARD_NUMBER,
    DEFAULT_PLAYERS_NUMBER,
    DEFAULT_DEALER_INDEX,
    START_ACTIVE_PILE_SIZE,
    DECK_SIZE,
    CUSTOM_DEALER_INDEX,
} from "../consts.js";

describe("dealHands", () => {
    const shuffledDeck = shuffleDeck(newDeck());
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
