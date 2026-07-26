import { afterEach, describe, expect, test, vi } from "vitest";
import PlayerHand from "./PlayerHand";
import { cleanup, render } from "@testing-library/react";
import { START_HAND_SIZE } from "../../../../shared/consts";
import type { Card } from "../../../../shared/types";

describe("PlayerHand", () => {
    const mockOnCardClick = vi.fn();
    const hand = [
        { rank: "7", suit: "hearts" },
        { rank: "Q", suit: "spades" },
        { rank: "A", suit: "clubs" },
        { rank: "10", suit: "diamonds" },
        { rank: "8", suit: "hearts" },
    ] as Card[];
    const cardsToPlay: Card[] = [];

    afterEach(() => {
        cleanup();
        vi.mocked(mockOnCardClick).mockClear();
    });

    test("Should show player hand with 5 cards", () => {
        const { container } = render(
            <PlayerHand
                cardsToPlay={cardsToPlay}
                hand={hand}
                onCardClick={mockOnCardClick}
            />
        );
        const handContainer: HTMLElement = container.querySelector(
            '[class*="player-hand-root"]'
        )!;
        expect(
            handContainer.querySelectorAll('[class*="card-front"]').length
        ).toBe(START_HAND_SIZE);
    });

    test("Clicking a card div should trigger onCardClick", () => {
        const { container } = render(
            <PlayerHand
                cardsToPlay={cardsToPlay}
                hand={hand}
                onCardClick={mockOnCardClick}
            />
        );
        const handContainer: HTMLElement = container.querySelector(
            '[class*="player-hand-root"]'
        )!;
        const cardWrapper: HTMLElement = handContainer.querySelector(
            '[class*="card-wrapper"]'
        )!;
        cardWrapper.click();
        expect(mockOnCardClick).toHaveBeenCalledWith(hand[0]);
    });

    test("Should highlight selected card", () => {
        const testCardsToPlay: Card[] = [{ rank: "7", suit: "hearts" }];
        const { container } = render(
            <PlayerHand
                cardsToPlay={testCardsToPlay}
                hand={hand}
                onCardClick={mockOnCardClick}
            />
        );
        const handContainer: HTMLElement = container.querySelector(
            '[class*="player-hand-root"]'
        )!;
        const cardWrapper: HTMLElement = handContainer.querySelector(
            '[class*="card-wrapper"]'
        )!;
        expect(cardWrapper.className).toContain("selected-card");
    });

    // test("Should remove highlight when card deselected", () => {
    //     const testCardsToPlay: Card[] = [{ rank: "7", suit: "hearts" }];
    //     const { container } = render(
    //         <PlayerHand
    //             cardsToPlay={testCardsToPlay}
    //             hand={hand}
    //             onCardClick={mockOnCardClick}
    //         />
    //     );
    //     const handContainer: HTMLElement = container.querySelector(
    //         '[class*="player-hand-root"]'
    //     )!;
    //     const selectedCardWrapper: HTMLElement = handContainer.querySelector(
    //         '[class*="selected-card"]'
    //     )!;
    //     selectedCardWrapper.click();
    //     expect(selectedCardWrapper.className).not.toContain("selected-card")
    // })

    test("Should show cards array indexes", () => {
        const testCardsToPlay: Card[] = [
            { rank: "7", suit: "hearts" },
            { rank: "Q", suit: "spades" },
        ];
        const { container } = render(
            <PlayerHand
                cardsToPlay={testCardsToPlay}
                hand={hand}
                onCardClick={mockOnCardClick}
            />
        );
        const handContainer: HTMLElement = container.querySelector(
            '[class*="player-hand-root"]'
        )!;
        const spansArray = handContainer.querySelectorAll("span");
        expect(spansArray[0].textContent).toBe("1");
        expect(spansArray[1].textContent).toBe("2");
    });
});
