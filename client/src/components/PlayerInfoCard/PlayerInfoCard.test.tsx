import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import PlayerInfoCard from "./PlayerInfoCard";

describe("PlayerInfoCard", () => {
    test("Should show nickname, score, proper number of cards in hand", () => {
        const { container } = render(
            <PlayerInfoCard
                isCurrentPlayer={false}
                isDealer={false}
                nickname="player1"
                id="someId"
                score={30}
                handCount={6}
            />
        );
        expect(container.querySelectorAll('[class*="card-back"]').length).toBe(
            6
        );
        screen.getByText("player1");
        screen.getByText("score: 30");
    });

    test("Should show current player marker when player is current player", () => {
        const { container } = render(
            <PlayerInfoCard
                isCurrentPlayer={false}
                isDealer={true}
                nickname="player1"
                id="someId"
                score={30}
                handCount={6}
            />
        );
        expect(container.querySelector('[class*="dealer"]')).not.toBeNull();
    });

    test("Should show dealer marker when player is dealer", () => {
        const { container } = render(
            <PlayerInfoCard
                isCurrentPlayer={true}
                isDealer={false}
                nickname="player1"
                id="someId"
                score={30}
                handCount={6}
            />
        );
        expect(
            container.querySelector('[class*="current-player"]')
        ).not.toBeNull();
    });
});
