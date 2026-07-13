import { render, screen } from "@testing-library/react";
import { describe, test } from "vitest";
import GameMenu from "./GameMenu";

describe("GameMenu", () => {
    test("Should render input and two buttons", () => {
        render(<GameMenu />);
        screen.getByRole("button", { name: "Create game" });
        screen.getByRole("button", { name: "Join game" });
    });
});
