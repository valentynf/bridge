import { render, screen, cleanup } from "@testing-library/react";
import { describe, test, expect, afterEach, vi } from "vitest";
import { userEvent } from "@testing-library/user-event";
import { SocketContext } from "../../context/SocketContext.js";
import type { Socket } from "socket.io-client";
import MenuScreen from "./MenuScreen.js";

describe("MenuScreen", () => {
    const mockSocket = { emit: vi.fn() } as unknown as Socket;

    afterEach(() => {
        cleanup();
        vi.mocked(mockSocket.emit).mockClear();
    });

    test("Should render one input and two buttons", () => {
        render(
            <SocketContext.Provider value={mockSocket}>
                <MenuScreen />
            </SocketContext.Provider>
        );
        screen.getByRole("button", { name: "Create game" });
        screen.getByRole("button", { name: "Join game" });
        screen.getByRole("textbox", { name: "room code" });
    });

    test("Buttons should be disabled if input is empty", () => {
        render(
            <SocketContext.Provider value={mockSocket}>
                <MenuScreen />
            </SocketContext.Provider>
        );
        expect(
            screen.getByRole("button", { name: "Join game" })
        ).toBeDisabled();
    });

    test("Button Join Game should be enabled if playerName & roomCode inputs are not empty", async () => {
        render(
            <SocketContext.Provider value={mockSocket}>
                <MenuScreen />
            </SocketContext.Provider>
        );
        await userEvent.type(
            screen.getByRole("textbox", { name: "room code" }),
            "a1b2c"
        );
        expect(screen.getByRole("button", { name: "Join game" })).toBeEnabled();
    });

    test("Create game button should emit create_room", async () => {
        render(
            <SocketContext.Provider value={mockSocket}>
                <MenuScreen />
            </SocketContext.Provider>
        );

        screen.getByRole("button", { name: "Create game" }).click();
        expect(mockSocket.emit).toHaveBeenCalledWith("create_room");
    });

    test("Join game button should emit join_room", async () => {
        render(
            <SocketContext.Provider value={mockSocket}>
                <MenuScreen />
            </SocketContext.Provider>
        );
        await userEvent.type(
            screen.getByRole("textbox", { name: "room code" }),
            "a1b2c"
        );
        screen.getByRole("button", { name: "Join game" }).click();
        expect(mockSocket.emit).toHaveBeenCalledWith("join_room", {
            roomCode: "a1b2c",
        });
    });
});
