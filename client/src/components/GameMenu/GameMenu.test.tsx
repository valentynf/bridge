import { render, screen, cleanup } from "@testing-library/react";
import { describe, test, expect, afterEach, vi } from "vitest";
import { userEvent } from "@testing-library/user-event";
import GameMenu from "./GameMenu";
import { SocketContext } from "../../context/SocketContext";
import type { Socket } from "socket.io-client";

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

    test("Buttons should be disabled if input is empty", () => {
        render(<GameMenu />);
        expect(
            screen.getByRole("button", { name: "Create game" })
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Join game" })
        ).toBeDisabled();
    });

    test("Buttons should be enabled if input is not empty", async () => {
        render(<GameMenu />);
        await userEvent.type(screen.getByRole("textbox"), "Name");
        expect(
            screen.getByRole("button", { name: "Create game" })
        ).toBeEnabled();
        expect(screen.getByRole("button", { name: "Join game" })).toBeEnabled();
    });

    test.skip("Create game button should emit create_room", async () => {
        const mockSocket = { emit: vi.fn() } as unknown as Socket;
        render(
            <SocketContext.Provider value={mockSocket}>
                <GameMenu />
            </SocketContext.Provider>
        );
        await userEvent.type(screen.getByRole("textbox"), "Name");
        screen.getByRole("button", { name: "Create game" }).click();
        expect(mockSocket.emit).toHaveBeenCalledWith("create_room", {
            playerName: "Name",
        });
    });
});
