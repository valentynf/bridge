import { describe, expect, test } from "vitest";
import { newDeck, shuffleDeck } from "../functions/deck.js";
import {
    applyPendingEffects,
    checkCanPlay,
    dealCards,
} from "../functions/game.js";
import {
    DEALER_CARD_NUMBER,
    PLAYER_CARD_NUMBER,
    DEFAULT_PLAYERS_NUMBER,
    DEFAULT_DEALER_INDEX,
    START_ACTIVE_PILE_SIZE,
    DECK_SIZE,
    CUSTOM_DEALER_INDEX,
} from "../consts.js";
import type { Card, PendingEffect } from "../types.js";

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

describe("playCards", () => {
    test("Active pile should have played cards on top", () => {});
    test("Played cards shouldn't be in hand after turn", () => {});
    test("During 0 turn, only same rank should be played", () => {});
    test("Only allowed cards should be played", () => {});
});

describe("applyPendingEffects", () => {
    const defaultHand = [
        { rank: "9", suit: "hearts" },
        { rank: "10", suit: "hearts" },
        { rank: "K", suit: "diamonds" },
        { rank: "8", suit: "clubs" },
    ];
    const defaultActivePile = [
        { rank: "7", suit: "spades" },
        { rank: "8", suit: "spades" },
        { rank: "9", suit: "spades" },
        { rank: "10", suit: "clubs" },
        { rank: "10", suit: "hearts" },
        { rank: "J", suit: "clubs" },
    ];
    const defaultDrawPile = [
        { rank: "Q", suit: "spades" },
        { rank: "J", suit: "clubs" },
        { rank: "K", suit: "spades" },
        { rank: "9", suit: "diamonds" },
    ];
    const smallDrawPile = [
        { rank: "Q", suit: "spades" },
        { rank: "J", suit: "clubs" },
    ];
    const defaultEffects = ["SKIP_TURN", "TAKE_CARD", "TAKE_CARD", "TAKE_CARD"];
    const defaultUpdatedData = applyPendingEffects(
        defaultDrawPile as Card[],
        defaultActivePile as Card[],
        defaultHand as Card[],
        defaultEffects as PendingEffect[]
    );

    test("Should skip turn and add three cards to hand", () => {
        const { updatedHand, skipTurn } = defaultUpdatedData;
        expect(skipTurn).toBe(true);
        expect(updatedHand.length).toBe(defaultHand.length + 3);
    });
    test("Should return active pile with only top card", () => {
        const smallDrawPileUpdatedData = applyPendingEffects(
            smallDrawPile as Card[],
            defaultActivePile as Card[],
            defaultHand as Card[],
            defaultEffects as PendingEffect[]
        );
        const { updatedActivePile, updatedHand, reshuffled } =
            smallDrawPileUpdatedData;
        expect(updatedActivePile).toEqual([defaultActivePile[0]]);
        expect(updatedHand.length).toBe(defaultHand.length + 3);
        expect(reshuffled).toBe(true);
    });
    test("Should make no changes to hand or piles", () => {
        const notUpdatedData = applyPendingEffects(
            defaultDrawPile as Card[],
            defaultActivePile as Card[],
            defaultHand as Card[],
            [] as PendingEffect[]
        );
        const {
            updatedDrawPile,
            updatedHand,
            updatedActivePile,
            skipTurn,
            reshuffled,
        } = notUpdatedData;
        expect({
            updatedDrawPile,
            updatedHand,
            updatedActivePile,
            skipTurn,
            reshuffled,
        }).toEqual({
            updatedDrawPile: defaultDrawPile,
            updatedHand: defaultHand,
            updatedActivePile: defaultActivePile,
            skipTurn: false,
            reshuffled: false,
        });
    });
    test("Should only skip turn", () => {
        const skipTurnData = applyPendingEffects(
            defaultDrawPile as Card[],
            defaultActivePile as Card[],
            defaultHand as Card[],
            ["SKIP_TURN"] as PendingEffect[]
        );
        const {
            updatedDrawPile,
            updatedHand,
            updatedActivePile,
            skipTurn,
            reshuffled,
        } = skipTurnData;
        expect({
            updatedDrawPile,
            updatedHand,
            updatedActivePile,
            skipTurn,
            reshuffled,
        }).toEqual({
            updatedDrawPile: defaultDrawPile,
            updatedHand: defaultHand,
            updatedActivePile: defaultActivePile,
            skipTurn: true,
            reshuffled: false,
        });
    });
    test("Should only draw cards", () => {
        const updatedData = applyPendingEffects(
            defaultDrawPile as Card[],
            defaultActivePile as Card[],
            defaultHand as Card[],
            ["TAKE_CARD"] as PendingEffect[]
        );
        const { updatedHand, skipTurn } = updatedData;
        expect(updatedHand.length).toBe(defaultHand.length + 1);
        expect(skipTurn).toBe(false);
    });
});

describe("checkCanPlay", () => {
    const defaultHand = [
        { rank: "9", suit: "hearts" },
        { rank: "10", suit: "spades" },
        { rank: "K", suit: "clubs" },
        { rank: "8", suit: "clubs" },
    ];
    const handWithJack = [
        { rank: "9", suit: "hearts" },
        { rank: "10", suit: "spades" },
        { rank: "K", suit: "clubs" },
        { rank: "8", suit: "clubs" },
        { rank: "J", suit: "hearts" },
    ];
    const defaultJackSuit = "diamonds";
    const defaultJack = { rank: "J", suit: "spades" };
    const defaultTopActivePileCard: Card = { rank: "6", suit: "diamonds" };

    test("Should be true - existing rank card", () => {
        const existingRankCard: Card = { rank: "10", suit: "diamonds" };
        const canPlay = checkCanPlay(
            existingRankCard,
            defaultHand as Card[],
            defaultJackSuit
        );
        expect(canPlay).toBe(true);
    });
    test("Should be true - existing suit card", () => {
        const existingSuitCard: Card = { rank: "A", suit: "spades" };
        const canPlay = checkCanPlay(
            existingSuitCard,
            defaultHand as Card[],
            defaultJackSuit
        );
        expect(canPlay).toBe(true);
    });
    test("Should be true - Jack in hand", () => {
        const canPlay = checkCanPlay(
            defaultTopActivePileCard,
            handWithJack as Card[],
            defaultJackSuit
        );
        expect(canPlay).toBe(true);
    });
    test("Should be false - active Jack (chosen suit)", () => {
        const canPlay = checkCanPlay(
            defaultJack as Card,
            defaultHand as Card[],
            defaultJackSuit
        );
        expect(canPlay).toBe(false);
    });
    test("Should be true - active Jack (chosen suit), Jack in hand", () => {
        const canPlay = checkCanPlay(
            defaultJack as Card,
            handWithJack as Card[],
            defaultJackSuit
        );
        expect(canPlay).toBe(true);
    });
    test("Should be true - active Jack (same suit)", () => {
        const canPlay = checkCanPlay(
            defaultJack as Card,
            defaultHand as Card[],
            "spades"
        );
        expect(canPlay).toBe(true);
    });
    test("Should be false - no legal play", () => {
        const noLegalPlayCard: Card = { rank: "Q", suit: "diamonds" };
        const canPlay = checkCanPlay(
            noLegalPlayCard as Card,
            defaultHand as Card[],
            defaultJackSuit
        );
        expect(canPlay).toBe(false);
    });
});
