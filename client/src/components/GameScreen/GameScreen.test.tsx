import { render, screen } from "@testing-library/react";
import { describe, test } from "vitest";
import GameScreen from "./GameScreen";

describe("GameScreen", () => {
    test("dummy test", () => {
        render(<GameScreen />);
        screen.getByRole("button", { name: "Play cards" });
    });
});
