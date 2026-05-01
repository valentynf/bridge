import { describe, expect, test } from "vitest";
import {
    applyPendingEffects,
    checkCanPlay,
    countPoints,
    playCards,
} from "../functions/game.js";
import type {
    Card,
    CardSuit,
    JackEndEffect,
    SpecialEffect,
} from "../../../shared/types.js";

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

describe("playCards", () => {
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
    test("Should return updatedData, match by rank (2 cards), take two cards", () => {
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
            { rank: "A", suit: "spades" },
            { rank: "8", suit: "spades" },
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
    test("Should return updated data, 6 with cover case", () => {
        const handWithSixAndCover: Card[] = [
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
            handWithSixAndCover,
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
        const handWithSixNoCover: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
            { rank: "6", suit: "spades" },
        ];
        const cardsToPlay: Card[] = [{ rank: "6", suit: "spades" }];
        const dataAfterTurn = playCards(
            handWithSixNoCover,
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
    test("Should return updated drawpile, 6 case (no play on hand, Jack)", () => {
        const handWithSixNoCover: Card[] = [
            { rank: "7", suit: "diamonds" },
            { rank: "6", suit: "spades" },
            { rank: "6", suit: "hearts" },
        ];
        const drawPileWithJack: Card[] = [
            { rank: "Q", suit: "spades" },
            { rank: "J", suit: "spades" },
            { rank: "K", suit: "spades" },
            { rank: "9", suit: "diamonds" },
        ];
        const cardsToPlay: Card[] = [
            { rank: "6", suit: "hearts" },
            { rank: "6", suit: "spades" },
        ];
        const dataAfterTurn = playCards(
            handWithSixNoCover,
            cardsToPlay,
            defaultActivePile,
            drawPileWithJack,
            defaultJackSuit
        );
        const updatedHand: Card[] = [
            { rank: "7", suit: "diamonds" },
            { rank: "Q", suit: "spades" },
        ];
        const updatedDrawPile = [
            { rank: "K", suit: "spades" },
            { rank: "9", suit: "diamonds" },
        ];
        const specialEffects: SpecialEffect[] = [];
        const updatedActivePile = [
            { rank: "J", suit: "spades" },
            { rank: "6", suit: "hearts" },
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
        const activePileWithCoverCard: Card[] = [
            { rank: "10", suit: "clubs" },
            { rank: "7", suit: "spades" },
            { rank: "10", suit: "spades" },
            { rank: "10", suit: "hearts" },
        ];
        const handWithSix: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "7", suit: "diamonds" },
            { rank: "6", suit: "clubs" },
        ];
        const smallDrawPile: Card[] = [
            { rank: "Q", suit: "spades" },
            { rank: "K", suit: "spades" },
            { rank: "9", suit: "diamonds" },
        ];
        const cardsToPlay: Card[] = [{ rank: "6", suit: "clubs" }];
        const dataAfterTurn = playCards(
            handWithSix,
            cardsToPlay,
            activePileWithCoverCard,
            smallDrawPile,
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
            activePileWithCoverCard.length +
                handWithSix.length +
                smallDrawPile.length
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
        const activePileTopJack: Card[] = [
            { rank: "J", suit: "clubs" },
            { rank: "7", suit: "spades" },
            { rank: "9", suit: "spades" },
            { rank: "8", suit: "clubs" },
        ];
        const dataAfterTurn = playCards(
            defaultHand,
            cardsToPlay,
            activePileTopJack,
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
        const handTwoEights: Card[] = [
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
            handTwoEights,
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
        const handWithTwoAces: Card[] = [
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
            handWithTwoAces,
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
        const cardsToPlay: Card[] = [{ rank: "K", suit: "spades" }];
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

describe("countPoints", () => {
    const defaultPlayersHands: Card[][] = [
        [
            { rank: "9", suit: "hearts" },
            { rank: "10", suit: "spades" },
            { rank: "K", suit: "clubs" },
            { rank: "8", suit: "diamonds" },
        ],
        [
            { rank: "J", suit: "hearts" },
            { rank: "7", suit: "spades" },
            { rank: "A", suit: "clubs" },
            { rank: "Q", suit: "diamonds" },
        ],
        [],
        [
            { rank: "8", suit: "clubs" },
            { rank: "7", suit: "diamonds" },
        ],
    ];
    const defaultWinnerIndex = 2;
    const defaultReshuffleMultiplier = 0;
    const defaultCurrentScores = [50, 20, 30, 10];
    test("Should return updated score, no multipliers", () => {
        const updatedScores = countPoints(
            defaultPlayersHands,
            defaultWinnerIndex,
            defaultReshuffleMultiplier,
            defaultCurrentScores
        );
        expect(updatedScores).toEqual([70, 65, 30, 10]);
    });
    test("Should return updated score, reshuffled once", () => {
        const reshuffledOnceMultiplier = 1;
        const updatedScores = countPoints(
            defaultPlayersHands,
            defaultWinnerIndex,
            reshuffledOnceMultiplier,
            defaultCurrentScores
        );
        expect(updatedScores).toEqual([90, 110, 30, 10]);
    });
    test("Should return updated score, bridge case", () => {
        const playerHandsAfterBrdige: Card[][] = [
            [
                { rank: "9", suit: "hearts" },
                { rank: "10", suit: "spades" },
                { rank: "K", suit: "clubs" },
                { rank: "8", suit: "diamonds" },
            ],
            [
                { rank: "J", suit: "hearts" },
                { rank: "7", suit: "spades" },
                { rank: "A", suit: "clubs" },
                { rank: "Q", suit: "diamonds" },
            ],
            [
                { rank: "8", suit: "spades" },
                { rank: "A", suit: "spades" },
            ],
            [
                { rank: "8", suit: "clubs" },
                { rank: "7", suit: "diamonds" },
                { rank: "Q", suit: "spades" },
            ],
        ];
        const updatedScores = countPoints(
            playerHandsAfterBrdige,
            defaultWinnerIndex,
            defaultReshuffleMultiplier,
            defaultCurrentScores
        );
        expect(updatedScores).toEqual([70, 65, 45, 20]);
    });
    test("Should return updated score, jack -20", () => {
        const oneJackMinus20: JackEndEffect = { option: "MINUS_20", count: 1 };
        const updatedScores = countPoints(
            defaultPlayersHands,
            defaultWinnerIndex,
            defaultReshuffleMultiplier,
            defaultCurrentScores,
            oneJackMinus20
        );
        expect(updatedScores).toEqual([70, 65, 10, 10]);
    });
    test("Should return updated score, jack x2", () => {
        const twoJacksToDouble: JackEndEffect = {
            option: "DOUBLE_ALL",
            count: 2,
        };
        const updatedScores = countPoints(
            defaultPlayersHands,
            defaultWinnerIndex,
            defaultReshuffleMultiplier,
            defaultCurrentScores,
            twoJacksToDouble
        );
        expect(updatedScores).toEqual([130, 200, 30, 10]);
    });
});
