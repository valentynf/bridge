import { render, screen, cleanup } from "@testing-library/react";
import { describe, test, expect, afterEach, vi } from "vitest";
import { userEvent } from "@testing-library/user-event";
import Menu from "./Menu.js";
import { SocketContext } from "../../context/SocketContext.js";
import type { Socket } from "socket.io-client";

describe("Menu", () => {
    const mockSocket = { emit: vi.fn() } as unknown as Socket;

    afterEach(() => {
        cleanup();
        vi.mocked(mockSocket.emit).mockClear();
    });

    test("Should render two inputs and two buttons", () => {
        render(<Menu />);
        screen.getByRole("button", { name: "Create game" });
        screen.getByRole("button", { name: "Join game" });
        screen.getByRole("textbox", { name: "playerName" });
        screen.getByRole("textbox", { name: "roomCode" });
    });

    test("Buttons should be disabled if input is empty", () => {
        render(<Menu />);
        expect(
            screen.getByRole("button", { name: "Create game" })
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Join game" })
        ).toBeDisabled();
    });

    test("Button Create Game should be enabled if nickname input is not empty", async () => {
        render(<Menu />);
        await userEvent.type(
            screen.getByRole("textbox", { name: "playerName" }),
            "Name"
        );
        expect(
            screen.getByRole("button", { name: "Create game" })
        ).toBeEnabled();
    });

    test("Button Join Game should be enabled if playerName & roomCode inputs are not empty", async () => {
        render(<Menu />);
        await userEvent.type(
            screen.getByRole("textbox", { name: "playerName" }),
            "Name"
        );
        await userEvent.type(
            screen.getByRole("textbox", { name: "roomCode" }),
            "someCode"
        );
        expect(screen.getByRole("button", { name: "Join game" })).toBeEnabled();
    });

    test("Create game button should emit create_room", async () => {
        render(
            <SocketContext.Provider value={mockSocket}>
                <Menu />
            </SocketContext.Provider>
        );
        await userEvent.type(
            screen.getByRole("textbox", { name: "playerName" }),
            "Name"
        );
        screen.getByRole("button", { name: "Create game" }).click();
        expect(mockSocket.emit).toHaveBeenCalledWith("create_room", {
            playerName: "Name",
        });
    });

    test("Join game button should emit join_room", async () => {
        render(
            <SocketContext.Provider value={mockSocket}>
                <Menu />
            </SocketContext.Provider>
        );
        await userEvent.type(
            screen.getByRole("textbox", { name: "playerName" }),
            "Name"
        );
        await userEvent.type(
            screen.getByRole("textbox", { name: "roomCode" }),
            "testcode"
        );
        screen.getByRole("button", { name: "Join game" }).click();
        expect(mockSocket.emit).toHaveBeenCalledWith("join_room", {
            playerName: "Name",
            roomCode: "testcode",
        });
    });
});
