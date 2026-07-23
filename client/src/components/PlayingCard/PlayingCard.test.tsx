import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import PlayingCard from "./PlayingCard";

describe("PlayingCard", () => {
    test("Should show rank and suit twice on the card front", () => {
        render(<PlayingCard faceUp={true} rank="Q" suit="spades" />);
        const res = screen.getAllByText("Q ♠");
        expect(res.length).toBe(2);
    });
});
