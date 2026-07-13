import { describe, expect, test } from "vitest";
import {
    applyPendingEffects,
    checkCanPlay,
    countPoints,
    countSpecialEffects,
    dealerOpeningPlay,
    generateInitialState,
    playCards,
} from "../functions/game.js";
import type {
    BridgeGameState,
    Card,
    CardSuit,
    JackEndEffect,
    LobbyMember,
    SpecialEffect,
} from "../../../shared/types.js";
import { START_ACTIVE_PILE_SIZE } from "../../../shared/consts.js";

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
            needsCover: false,
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
            needsCover: false,
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
            needsCover: false,
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
            needsCover: false,
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
            needsCover: false,
        });
    });
    test("Should return updated data, cannot cover 6 from hand, needsCover: true", () => {
        const handWithSixNoCover: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "A", suit: "diamonds" },
            { rank: "6", suit: "spades" },
            { rank: "6", suit: "diamonds" },
        ];
        const playingCardOnlySix: Card[] = [{ rank: "6", suit: "spades" }];
        const updatedData = playCards(
            handWithSixNoCover,
            playingCardOnlySix,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        if (!updatedData) {
            expect.fail();
        }
        const { needsCover } = updatedData;
        expect(needsCover).toBe(true);
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
        expect(dataAfterTurn).toEqual(undefined);
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
            needsCover: false,
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
            needsCover: false,
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
            needsCover: false,
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
            needsCover: false,
        });
    });
    test("Should return undefined, illegal hand (wrong rank and suit)", () => {
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

        expect(dataAfterTurn).toEqual(undefined);
    });
    test("Should return undefined, cards not on hand", () => {
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

        expect(dataAfterTurn).toEqual(undefined);
    });
    test("Should return undefined, different ranks pair", () => {
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

        expect(dataAfterTurn).toEqual(undefined);
    });
    test("Should return updated data, 6 covered by 7/8", () => {
        const handWithSixSevenEigth: Card[] = [
            { rank: "7", suit: "spades" },
            { rank: "8", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const handSevenCoverSix: Card[] = [
            { rank: "7", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const handEightCoverSix: Card[] = [
            { rank: "8", suit: "spades" },
            { rank: "6", suit: "spades" },
        ];
        const dataWithSevenEffects = playCards(
            handWithSixSevenEigth,
            handSevenCoverSix,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        if (!dataWithSevenEffects) {
            expect.fail();
        }
        expect(dataWithSevenEffects.specialEffects).toEqual(["TAKE_CARD"]);
        const dataWithEightEffects = playCards(
            handWithSixSevenEigth,
            handEightCoverSix,
            defaultActivePile,
            defaultDrawPile,
            defaultJackSuit
        );
        if (!dataWithEightEffects) {
            expect.fail();
        }
        expect(dataWithEightEffects.specialEffects).toEqual([
            "TAKE_CARD",
            "TAKE_CARD",
            "SKIP_TURN",
        ]);
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

describe("countSpecialEffects", () => {
    test("Should return one skipped turn (no distribution)", () => {
        const cards: Card[] = [
            { rank: "A", suit: "clubs" },
            { rank: "A", suit: "diamonds" },
        ];
        const effects: SpecialEffect[] = countSpecialEffects(cards);
        expect(effects).toEqual(["SKIP_TURN"]);
    });
    test("Should return skipped turn, two take cards", () => {
        const cards: Card[] = [{ rank: "8", suit: "clubs" }];
        const effects: SpecialEffect[] = countSpecialEffects(cards);
        expect(effects).toEqual(["TAKE_CARD", "TAKE_CARD", "SKIP_TURN"]);
    });
    test("Should return two take cards", () => {
        const cards: Card[] = [
            { rank: "7", suit: "clubs" },
            { rank: "7", suit: "diamonds" },
        ];
        const effects: SpecialEffect[] = countSpecialEffects(cards);
        expect(effects).toEqual(["TAKE_CARD", "TAKE_CARD"]);
    });
    test("Should return empty array", () => {
        const cards: Card[] = [
            { rank: "10", suit: "clubs" },
            { rank: "10", suit: "diamonds" },
        ];
        const effects: SpecialEffect[] = countSpecialEffects(cards);
        expect(effects).toEqual([]);
    });
});

describe("dealerOpeningPlay", () => {
    const defaultHand: Card[] = [
        { rank: "9", suit: "hearts" },
        { rank: "9", suit: "spades" },
        { rank: "K", suit: "clubs" },
        { rank: "8", suit: "clubs" },
    ];
    const defaultCardsToPlay: Card[] = [
        { rank: "9", suit: "hearts" },
        { rank: "9", suit: "spades" },
    ];
    const defaultTopActivePileCard: Card = { rank: "9", suit: "clubs" };
    test("Should return updated data, playing same rank cards", () => {
        const data = dealerOpeningPlay(
            defaultHand,
            defaultCardsToPlay,
            defaultTopActivePileCard
        );
        expect(data).toEqual({
            updatedActivePile: [
                { rank: "9", suit: "hearts" },
                { rank: "9", suit: "spades" },
                { rank: "9", suit: "clubs" },
            ],
            updatedHand: [
                { rank: "K", suit: "clubs" },
                { rank: "8", suit: "clubs" },
            ],
        });
    });
    test("Should return same active pile, no cards played", () => {
        const data = dealerOpeningPlay(
            defaultHand,
            [],
            defaultTopActivePileCard
        );
        expect(data).toEqual({
            updatedActivePile: [defaultTopActivePileCard],
            updatedHand: defaultHand,
        });
    });
    test("Should return undefined, doesn't match by rank", () => {
        const differentRankCard: Card = { rank: "K", suit: "clubs" };
        const data = dealerOpeningPlay(
            defaultHand,
            [differentRankCard],
            defaultTopActivePileCard
        );
        expect(data).toEqual(undefined);
    });
    test("Should return undefined, playing card not on hand", () => {
        const cardNotOnHand: Card = { rank: "Q", suit: "clubs" };
        const data = dealerOpeningPlay(
            defaultHand,
            [cardNotOnHand],
            defaultTopActivePileCard
        );
        expect(data).toEqual(undefined);
    });
});

describe("generateInitialState", () => {
    const fourMembersLobby: LobbyMember[] = [
        { nickname: "player1", id: "id1", isReady: true },
        { nickname: "player2", id: "id2", isReady: true },
        { nickname: "player3", id: "id3", isReady: true },
        { nickname: "player4", id: "id4", isReady: true },
    ];
    test("Should have default values, 4 players", () => {
        const initialStateFourPlayers: BridgeGameState = generateInitialState(
            fourMembersLobby,
            2
        );
        const {
            players,
            activePile,
            drawPile,
            currentDealerIndex,
            currentPlayerIndex,
            reshuffleCount,
        } = initialStateFourPlayers;
        expect(players.length).toBe(4);
        expect(activePile.length).toBe(START_ACTIVE_PILE_SIZE);
        expect(drawPile.length).toBe(16);
        expect(currentDealerIndex).toBe(currentPlayerIndex);
        expect(players[currentDealerIndex].hand.length).toBe(4);
        expect(reshuffleCount).toBe(0);
        expect(
            players.every(
                (player, i) =>
                    player.nickname === fourMembersLobby[i].nickname &&
                    player.id === fourMembersLobby[i].id
            )
        ).toBe(true);
    });
    test("Should have default values, 2 players", () => {
        const [memberOne, memberTwo] = fourMembersLobby;
        const twoMembersLobby: LobbyMember[] = [memberOne, memberTwo];
        const initialStateTwoPlayers: BridgeGameState = generateInitialState(
            twoMembersLobby,
            0
        );
        const { players, drawPile } = initialStateTwoPlayers;
        expect(drawPile.length).toBe(26);
        expect(players.length).toBe(2);
    });
});
