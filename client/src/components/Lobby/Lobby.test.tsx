import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Lobby from "./Lobby";
import type { LobbyMember } from "../../../../shared/types";
import type { Socket } from "socket.io-client";
import { SocketContext } from "../../context/SocketContext";
import userEvent from "@testing-library/user-event";
import { ToastContextProvider, ToastContext } from "../../context/ToastContext";

describe("Lobby", () => {
    const mockSocket = { emit: vi.fn() } as unknown as Socket;
    const mockShowToast = vi.fn();
    const mockNavigator = Object.assign(navigator, {
        clipboard: { writeText: vi.fn() },
    });

    const testMembers: LobbyMember[] = [
        { id: "id1", nickname: "player1", isReady: false },
        { id: "id2", nickname: "player2", isReady: false },
        { id: "id3", nickname: "player3", isReady: false },
    ];

    afterEach(() => {
        cleanup();
        vi.mocked(mockSocket.emit).mockClear();
    });

    test("Two buttons and list of players should render", () => {
        render(
            <ToastContextProvider>
                <SocketContext.Provider value={mockSocket}>
                    <Lobby roomCode="roomCode" roomMembers={testMembers} />
                </SocketContext.Provider>
            </ToastContextProvider>
        );
        screen.getByRole("button", { name: "roomCode" });
        screen.getByRole("button", { name: "Ready" });
        for (const member of testMembers) screen.getByText(member.nickname);
    });

    test("Ready button should emit player_ready", () => {
        render(
            <ToastContextProvider>
                <SocketContext.Provider value={mockSocket}>
                    <Lobby roomCode="roomCode" roomMembers={testMembers} />
                </SocketContext.Provider>
            </ToastContextProvider>
        );
        screen.getByRole("button", { name: "Ready" }).click();
        expect(mockSocket.emit).toHaveBeenCalledWith("player_ready");
    });

    test("Ready button should be disabled after click", async () => {
        render(
            <ToastContextProvider>
                <SocketContext.Provider value={mockSocket}>
                    <Lobby roomCode="roomCode" roomMembers={testMembers} />
                </SocketContext.Provider>
            </ToastContextProvider>
        );
        await userEvent.click(screen.getByRole("button", { name: "Ready" }));
        expect(screen.getByRole("button", { name: "Ready" })).toBeDisabled();
    });

    test("Copy room code should add room code to clipboard and show a toast", () => {
        render(
            <ToastContext.Provider value={mockShowToast}>
                <SocketContext.Provider value={mockSocket}>
                    <Lobby roomCode="roomCode" roomMembers={testMembers} />
                </SocketContext.Provider>
            </ToastContext.Provider>
        );
        screen.getByRole("button", { name: "roomCode" }).click();
        expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith(
            "roomCode"
        );
        expect(mockShowToast).toHaveBeenCalledWith({
            message: "Copied to clipboard!",
            level: "success",
        });
    });
});
