import { render, screen, cleanup } from "@testing-library/react";
import { describe, test, expect, afterEach } from "vitest";
import GameMenu from "./GameMenu";

describe("GameMenu", () => {
    afterEach(() => {
        cleanup();
    });

    test("Should render input and two buttons", () => {
        render(<GameMenu />);
        screen.getByRole("button", { name: "Create game" });
        screen.getByRole("button", { name: "Join game" });
        screen.getByRole("textbox");
    });
    test("Should render disabled buttons if input empty", () => {
        render(<GameMenu />);
        expect(
            screen.getByRole("button", { name: "Create game" })
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Join game" })
        ).toBeDisabled();
    });
});
