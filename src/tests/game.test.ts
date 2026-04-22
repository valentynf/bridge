import { describe, expect, test } from "vitest";
import { newDeck, shuffleDeck } from "../functions/deck.js";
import {
    applyPendingEffects,
    checkCanPlay,
    dealCards,
    playCards,
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
import type { Card, CardSuit, SpecialEffect } from "../types.js";

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
        defaultEffects as SpecialEffect[]
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
            defaultEffects as SpecialEffect[]
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
            [] as SpecialEffect[]
        );
        expect(notUpdatedData).toEqual({
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
            ["SKIP_TURN"] as SpecialEffect[]
        );
        expect(skipTurnData).toEqual({
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
            ["TAKE_CARD"] as SpecialEffect[]
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

describe.skip("playCards", () => {
    const defaultHand: Card[] = [
        { rank: "7", suit: "hearts" },
        { rank: "7", suit: "diamonds" },
        { rank: "J", suit: "clubs" },
        { rank: "A", suit: "spades" },
        { rank: "8", suit: "spades" },
        { rank: "6", suit: "spades" },
    ];
    const defaultActivePile: Card[] = [
        { rank: "7", suit: "spades" },
        { rank: "9", suit: "spades" },
        { rank: "8", suit: "clubs" },
        { rank: "10", suit: "clubs" },
        { rank: "10", suit: "hearts" },
        { rank: "J", suit: "clubs" },
    ];
    const defaultDrawPile: Card[] = [
        { rank: "Q", suit: "spades" },
        { rank: "J", suit: "spades" },
        { rank: "K", suit: "spades" },
        { rank: "9", suit: "diamonds" },
    ];
    const defaultJackSuit: CardSuit = "diamonds";

    test("Should return updatedData, match by rank, take card", () => {
        const cardsToPlay: Card[] = [{ rank: "7", suit: "diamonds" }];
        const dataAfterTurn = playCards(
            defaultHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "J", suit: "clubs" },
            { rank: "A", suit: "spades" },
            { rank: "8", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const updatedDrawPile = [...defaultDrawPile];
        const specialEffects: SpecialEffect[] = ["TAKE_CARD"];
        const updatedActivePile = [
            { rank: "7", suit: "diamonds" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
            { rank: "10", suit: "clubs" },
            { rank: "10", suit: "hearts" },
            { rank: "J", suit: "clubs" },
        ];
        expect(dataAfterTurn).toEqual({
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled: false,
        });
    });
    test("Should return updatedData, match by rank, take two cards", () => {
        const cardsToPlay: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
        ];
        const dataAfterTurn = playCards(
            defaultHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "J", suit: "clubs" },
            { rank: "A", suit: "spades" },
            { rank: "8", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const updatedDrawPile = [...defaultDrawPile];
        const specialEffects: SpecialEffect[] = ["TAKE_CARD", "TAKE_CARD"];
        const updatedActivePile = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
            { rank: "10", suit: "clubs" },
            { rank: "10", suit: "hearts" },
            { rank: "J", suit: "clubs" },
        ];
        expect(dataAfterTurn).toEqual({
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled: false,
        });
    });
    test("Should return updatedData, match by suit, take two cards, skip turn", () => {
        const cardsToPlay: Card[] = [{ rank: "8", suit: "spades" }];
        const dataAfterTurn = playCards(
            defaultHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
            { rank: "J", suit: "clubs" },
            { rank: "A", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const updatedDrawPile = [...defaultDrawPile];
        const specialEffects: SpecialEffect[] = [
            "TAKE_CARD",
            "TAKE_CARD",
            "SKIP_TURN",
        ];
        const updatedActivePile = [
            { rank: "8", suit: "spades" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
            { rank: "10", suit: "clubs" },
            { rank: "10", suit: "hearts" },
            { rank: "J", suit: "clubs" },
        ];
        expect(dataAfterTurn).toEqual({
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled: false,
        });
    });
    test("Should return updatedData, playing Jack", () => {
        const cardsToPlay: Card[] = [{ rank: "J", suit: "clubs" }];
        const dataAfterTurn = playCards(
            defaultHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
            { rank: "8", suit: "spades" },
            { rank: "A", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const updatedDrawPile = [...defaultDrawPile];
        const specialEffects: SpecialEffect[] = [];
        const updatedActivePile = [
            { rank: "J", suit: "clubs" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
            { rank: "10", suit: "clubs" },
            { rank: "10", suit: "hearts" },
            { rank: "J", suit: "clubs" },
        ];
        expect(dataAfterTurn).toEqual({
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled: false,
        });
    });
    test("Should return updated data, 6 case", () => {
        const anotherHand: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
            { rank: "9", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const cardsToPlay: Card[] = [
            { rank: "9", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const dataAfterTurn = playCards(
            anotherHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
        ];
        const updatedDrawPile = [...defaultDrawPile];
        const specialEffects: SpecialEffect[] = [];
        const updatedActivePile = [
            { rank: "9", suit: "spades" },
            { rank: "6", suit: "spades" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
            { rank: "10", suit: "clubs" },
            { rank: "10", suit: "hearts" },
            { rank: "J", suit: "clubs" },
        ];
        expect(dataAfterTurn).toEqual({
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled: false,
        });
    });
    test("Should return updated drawpile, 6 case (no play on hand)", () => {
        const anotherHand: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
            { rank: "6", suit: "spades" },
        ];
        const cardsToPlay: Card[] = [{ rank: "6", suit: "spades" }];
        const dataAfterTurn = playCards(
            anotherHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
        ];
        const updatedDrawPile = [
            { rank: "J", suit: "spades" },
            { rank: "K", suit: "spades" },
            { rank: "9", suit: "diamonds" },
        ];
        const specialEffects: SpecialEffect[] = [];
        const updatedActivePile = [
            { rank: "Q", suit: "spades" },
            { rank: "6", suit: "spades" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
            { rank: "10", suit: "clubs" },
            { rank: "10", suit: "hearts" },
            { rank: "J", suit: "clubs" },
        ];
        expect(dataAfterTurn).toEqual({
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled: false,
        });
    });
    test("Should return updated pile, 6 case (no play on hand), small pile", () => {
        const anotherActivePile: Card[] = [
            { rank: "10", suit: "clubs" },
            { rank: "7", suit: "spades" },
            { rank: "10", suit: "spades" },
            { rank: "10", suit: "hearts" },
            { rank: "J", suit: "hearts" },
        ];
        const anotherHand: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
            { rank: "6", suit: "clubs" },
        ];
        const cardsToPlay: Card[] = [{ rank: "6", suit: "clubs" }];
        const dataAfterTurn = playCards(
            anotherHand,
            cardsToPlay,
            anotherActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedActivePile = [
            { rank: "10", suit: "clubs" },
            { rank: "6", suit: "clubs" },
        ];
        expect(
            dataAfterTurn.updatedHand.some(
                (card) => card.rank === "6" && card.suit === "clubs"
            )
        ).toBe(false);
        expect(dataAfterTurn.updatedActivePile).toEqual(updatedActivePile);
        expect(
            anotherActivePile.length +
                anotherHand.length +
                defaultDrawPile.length
        ).toBe(
            dataAfterTurn.updatedActivePile.length +
                dataAfterTurn.updatedDrawPile.length +
                dataAfterTurn.updatedHand.length
        );
        expect(dataAfterTurn.reshuffled).toBe(true);
    });
    test("Should return same data, empty hand", () => {
        const cardsToPlay: Card[] = [];
        const dataAfterTurn = playCards(
            defaultHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        expect(dataAfterTurn).toEqual({
            updatedHand: defaultHand,
            updatedActivePile: defaultActivePile,
            updatedDrawPile: defaultDrawPile,
            specialEffects: [],
            reshuffled: false,
        });
    });
    test("Should return updated pile, match by Jack suit", () => {
        const cardsToPlay: Card[] = [{ rank: "7", suit: "diamonds" }];
        const anotherActivePile: Card[] = [
            { rank: "J", suit: "clubs" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
        ];
        const dataAfterTurn = playCards(
            defaultHand,
            cardsToPlay,
            anotherActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "J", suit: "clubs" },
            { rank: "A", suit: "spades" },
            { rank: "8", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const updatedDrawPile = [...defaultDrawPile];
        const specialEffects: SpecialEffect[] = ["TAKE_CARD"];
        const updatedActivePile = [
            { rank: "7", suit: "diamonds" },
            { rank: "J", suit: "clubs" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
        ];
        expect(dataAfterTurn).toEqual({
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled: false,
        });
    });
    test("Should return skip turn, 4 take cards effects (8s)", () => {
        const anotherHand: Card[] = [
            { rank: "8", suit: "hearts" },
            { rank: "8", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const cardsToPlay: Card[] = [
            { rank: "8", suit: "hearts" },
            { rank: "8", suit: "spades" },
        ];
        const dataAfterTurn = playCards(
            anotherHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "9", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const updatedDrawPile = [...defaultDrawPile];
        const specialEffects: SpecialEffect[] = [
            "TAKE_CARD",
            "TAKE_CARD",
            "TAKE_CARD",
            "TAKE_CARD",
            "SKIP_TURN",
        ];
        const updatedActivePile = [
            { rank: "8", suit: "hearts" },
            { rank: "8", suit: "spades" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
            { rank: "10", suit: "clubs" },
            { rank: "10", suit: "hearts" },
            { rank: "J", suit: "clubs" },
        ];
        expect(dataAfterTurn).toEqual({
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled: false,
        });
    });
    test("Should return skip turn effect (A)", () => {
        const cardsToPlay: Card[] = [{ rank: "A", suit: "spades" }];
        const dataAfterTurn = playCards(
            defaultHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
            { rank: "J", suit: "clubs" },
            { rank: "8", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const updatedDrawPile = [...defaultDrawPile];
        const specialEffects: SpecialEffect[] = ["SKIP_TURN"];
        const updatedActivePile = [
            { rank: "A", suit: "spades" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
            { rank: "10", suit: "clubs" },
            { rank: "10", suit: "hearts" },
            { rank: "J", suit: "clubs" },
        ];
        expect(dataAfterTurn).toEqual({
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled: false,
        });
    });
    test("Should return skip turn effect (As)", () => {
        const anotherHand: Card[] = [
            { rank: "J", suit: "clubs" },
            { rank: "8", suit: "spades" },
            { rank: "6", suit: "spades" },
            { rank: "A", suit: "spades" },
            { rank: "A", suit: "diamonds" },
        ];
        const cardsToPlay: Card[] = [
            { rank: "A", suit: "diamonds" },
            { rank: "A", suit: "spades" },
        ];
        const dataAfterTurn = playCards(
            anotherHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "J", suit: "clubs" },
            { rank: "8", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const updatedDrawPile = [...defaultDrawPile];
        const specialEffects: SpecialEffect[] = ["SKIP_TURN"];
        const updatedActivePile = [
            { rank: "A", suit: "diamonds" },
            { rank: "A", suit: "spades" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
            { rank: "10", suit: "clubs" },
            { rank: "10", suit: "hearts" },
            { rank: "J", suit: "clubs" },
        ];
        expect(dataAfterTurn).toEqual({
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled: false,
        });
    });
    test("Should return same data, illegal hand (wrong rank and suit)", () => {
        const anotherHand: Card[] = [
            { rank: "J", suit: "clubs" },
            { rank: "8", suit: "spades" },
            { rank: "6", suit: "spades" },
            { rank: "A", suit: "spades" },
            { rank: "A", suit: "diamonds" },
        ];
        const cardsToPlay: Card[] = [{ rank: "A", suit: "diamonds" }];
        const dataAfterTurn = playCards(
            anotherHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );

        expect(dataAfterTurn).toEqual({
            updatedHand: anotherHand,
            updatedActivePile: defaultActivePile,
            updatedDrawPile: defaultDrawPile,
            specialEffects: [],
            reshuffled: false,
        });
    });
    test("Should return same data, cards not on hand", () => {
        const anotherHand: Card[] = [
            { rank: "J", suit: "clubs" },
            { rank: "8", suit: "spades" },
            { rank: "6", suit: "spades" },
            { rank: "A", suit: "spades" },
            { rank: "A", suit: "diamonds" },
        ];
        const cardsToPlay: Card[] = [{ rank: "10", suit: "diamonds" }];
        const dataAfterTurn = playCards(
            anotherHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );

        expect(dataAfterTurn).toEqual({
            updatedHand: anotherHand,
            updatedActivePile: defaultActivePile,
            updatedDrawPile: defaultDrawPile,
            specialEffects: [],
            reshuffled: false,
        });
    });
    test("Should return same data, different ranks pair", () => {
        const anotherHand: Card[] = [
            { rank: "J", suit: "clubs" },
            { rank: "9", suit: "spades" },
            { rank: "10", suit: "spades" },
            { rank: "A", suit: "spades" },
            { rank: "A", suit: "diamonds" },
        ];
        const cardsToPlay: Card[] = [
            { rank: "9", suit: "spades" },
            { rank: "10", suit: "spades" },
        ];
        const dataAfterTurn = playCards(
            anotherHand,
            cardsToPlay,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );

        expect(dataAfterTurn).toEqual({
            updatedHand: anotherHand,
            updatedActivePile: defaultActivePile,
            updatedDrawPile: defaultDrawPile,
            specialEffects: [],
            reshuffled: false,
        });
    });
});
