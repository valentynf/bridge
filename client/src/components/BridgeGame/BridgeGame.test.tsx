import {
    cleanup,
    render,
    act,
    screen,
    waitFor,
    fireEvent,
} from "@testing-library/react";
import type { Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import BridgeGame from "./BridgeGame";
import { SocketContext } from "../../context/SocketContext";
import { ToastContext } from "../../context/ToastContext";
import apiClient from "../../api/apiClient";

vi.mock("../../api/apiClient");

describe("BridgeGame", () => {
    let container: HTMLElement;
    const mockSocket = {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    } as unknown as Socket;
    const mockShowToast = vi.fn();

    const renderBridgeGame = (): HTMLElement => {
        const { container } = render(
            <ToastContext.Provider value={mockShowToast}>
                <SocketContext.Provider value={mockSocket}>
                    <BridgeGame />
                </SocketContext.Provider>
            </ToastContext.Provider>
        );
        return container;
    };

    const emitEvent = (eventName: string, payload?: unknown): void => {
        const emitCallback = vi
            .mocked(mockSocket.on)
            .mock.calls.find((array) => array[0] === eventName)![1];
        emitCallback(payload);
    };

    afterEach(() => {
        cleanup();
        vi.mocked(mockSocket.emit).mockClear();
        vi.mocked(mockSocket.on).mockClear();
        vi.mocked(mockSocket.off).mockClear();
        vi.mocked(mockShowToast).mockClear();
    });

    beforeEach(() => {
        vi.mocked(apiClient.get).mockRejectedValue({});
        container = renderBridgeGame();
    });

    test("Should render login view on /me reject", () => {
        expect(
            container.querySelector('[class*="auth-screen-root"]')
        ).not.toBeNull();
    });

    test("Should render menu on /me success", async () => {
        cleanup();
        vi.mocked(apiClient.get).mockResolvedValue({
            data: { id: "1", email: "x@y.com", nickname: "testuser" },
        });
        container = renderBridgeGame();

        await waitFor(() => {
            expect(
                container.querySelector('[class*="menu-root"]')
            ).not.toBeNull();
        });
    });

    test("Should switch to menu view after successful login", async () => {
        const fakeUser = { id: "1", email: "x@y.com", nickname: "testuser" };
        vi.mocked(apiClient.post).mockResolvedValue({ data: fakeUser });

        const inputs = container.querySelectorAll("input");
        const identifierInput = inputs[0] as HTMLInputElement;
        const passwordInput = inputs[1] as HTMLInputElement;

        fireEvent.change(identifierInput, { target: { value: "testuser" } });
        fireEvent.change(passwordInput, { target: { value: "password123" } });

        await act(async () => {
            screen.getByRole("button", { name: "Login" }).click();
        });

        expect(container.querySelector('[class*="menu-root"]')).not.toBeNull();
        expect(
            container.querySelector('[class*="auth-screen-root"]')
        ).toBeNull();
    });

    test("Should switch to lobby view and show room code on room_created", () => {
        act(() => {
            emitEvent("room_created", { roomCode: "ABCD" });
        });
        expect(container.querySelector('[class*="lobby-root"]')).not.toBeNull();
        expect(container.querySelector('[class*="menu-root"]')).toBeNull();
        screen.getByText("ABCD");
    });

    test("Should switch to lobby view and show players on room_joined", () => {
        act(() => {
            emitEvent("room_joined", {
                roomMembers: [
                    { id: "socket01abc", nickname: "valentyn", isReady: true },
                    {
                        id: "socket02def",
                        nickname: "player2nd",
                        isReady: false,
                    },
                ],
            });
        });
        expect(container.querySelector('[class*="lobby-root"]')).not.toBeNull();
        expect(container.querySelector('[class*="menu-root"]')).toBeNull();
        screen.getByText("valentyn");
        screen.getByText("player2nd");
    });

    test("Should switch to game view on game_started", async () => {
        cleanup();
        vi.mocked(mockSocket.on).mockClear();
        vi.mocked(apiClient.get).mockResolvedValue({
            data: { id: "1", email: "x@y.com", nickname: "testuser" },
        });
        container = renderBridgeGame();
        await waitFor(() =>
            expect(
                container.querySelector('[class*="menu-root"]')
            ).not.toBeNull()
        );
        act(() => {
            emitEvent("game_started");
        });
        expect(
            container.querySelector('[class*="gamescreen-root"]')
        ).not.toBeNull();
        expect(container.querySelector('[class*="lobby-root"]')).toBeNull();
    });

    test("Should switch to game over view on game_over", () => {
        act(() => {
            emitEvent("round_started", {
                players: [
                    { id: "socket01abc", nickname: "valentyn", score: 0 },
                    { id: "socket02def", nickname: "player2nd", score: 0 },
                    { id: "socket03ghi", nickname: "player3rd", score: 0 },
                    { id: "socket04jkl", nickname: "player4th", score: 0 },
                ],
            });
        });
        act(() => {
            emitEvent("game_over", {
                finalScores: [45, 88, 120, 132],
                winnerIndex: 2,
            });
        });

        expect(
            container.querySelector('[class*="game-over-screen-root"]')
        ).not.toBeNull();
    });

    test("Should show players scores on game_over", () => {
        act(() => {
            emitEvent("round_started", {
                players: [
                    { id: "socket01abc", nickname: "valentyn", score: 0 },
                    { id: "socket02def", nickname: "player2nd", score: 0 },
                    { id: "socket03ghi", nickname: "player3rd", score: 0 },
                    { id: "socket04jkl", nickname: "player4th", score: 0 },
                ],
            });
        });
        act(() => {
            emitEvent("game_over", {
                finalScores: [45, 88, 120, 132],
                winnerIndex: 2,
            });
        });
        screen.getByText("valentyn");
        screen.getByText("player2nd");
        expect(screen.getAllByText("player3rd").length).toBe(2);
        screen.getByText("player4th");
        screen.getByText("45");
        screen.getByText("88");
        screen.getByText("120");
        screen.getByText("132");
    });

    test("Should switch to menu view upon clicking Back to Menu button", () => {
        act(() => {
            emitEvent("round_started", {
                players: [
                    { id: "socket01abc", nickname: "valentyn", score: 0 },
                    { id: "socket02def", nickname: "player2nd", score: 0 },
                    { id: "socket03ghi", nickname: "player3rd", score: 0 },
                    { id: "socket04jkl", nickname: "player4th", score: 0 },
                ],
            });
        });
        act(() => {
            emitEvent("game_over", {
                finalScores: [45, 88, 120, 132],
                winnerIndex: 2,
            });
        });
        act(() => {
            screen.getByRole("button", { name: "Back to Menu" }).click();
        });
        expect(container.querySelector('[class*="menu-root"]')).not.toBeNull();
    });

    test("Should reset state after returning to menu", () => {
        act(() => {
            emitEvent("room_created", { roomCode: "ABCD" });
        });
        act(() => {
            emitEvent("game_started");
        });
        act(() => {
            emitEvent("round_started", {
                players: [
                    { id: "socket01abc", nickname: "valentyn", score: 0 },
                ],
            });
        });
        act(() => {
            emitEvent("game_over", { finalScores: [45], winnerIndex: 0 });
        });
        act(() => {
            screen.getByRole("button", { name: "Back to Menu" }).click();
        });

        expect(screen.queryByText("ABCD")).toBeNull();
    });
});
