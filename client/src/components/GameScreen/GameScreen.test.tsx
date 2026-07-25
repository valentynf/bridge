import { cleanup, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import GameScreen from "./GameScreen";
import type { Socket } from "socket.io-client";
import { SocketContext } from "../../context/SocketContext";
import { ToastContext } from "../../context/ToastContext";
import { START_HAND_SIZE } from "../../../../shared/consts";

describe("GameScreen", () => {
    let container: HTMLElement;
    const mockSocket = {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    } as unknown as Socket;
    const mockShowToast = vi.fn();
    mockSocket.id = "socket01abc";

    const renderGameScreen = (): HTMLElement => {
        const { container } = render(
            <ToastContext.Provider value={mockShowToast}>
                <SocketContext.Provider value={mockSocket}>
                    <GameScreen />
                </SocketContext.Provider>
            </ToastContext.Provider>
        );
        return container;
    };

    const emitEvent = (eventName: string, payload: unknown): void => {
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

    describe("4 oponent, players turn", () => {
        const roundStartedData = {
            hand: [
                { rank: "7", suit: "hearts" },
                { rank: "Q", suit: "spades" },
                { rank: "A", suit: "clubs" },
                { rank: "10", suit: "diamonds" },
                { rank: "8", suit: "hearts" },
            ],
            activePileTopCard: { rank: "J", suit: "clubs" },
            dealerIndex: 3,
            currentPlayerIndex: 0,
            players: [
                { id: "socket01abc", nickname: "valentyn", score: 0 },
                { id: "socket02def", nickname: "player2nd", score: 15 },
                { id: "socket03ghi", nickname: "player3rd", score: 40 },
                { id: "socket04jkl", nickname: "player4th", score: 80 },
            ],
        };

        beforeEach(() => {
            container = renderGameScreen();
            act(() => {
                emitEvent("round_started", roundStartedData);
            });
        });

        test("Should show players hand on round_start", () => {
            const handContainer: HTMLElement = container.querySelector(
                '[class*="player-hand"]'
            )!;
            expect(
                handContainer.querySelectorAll('[class*="card-front"]').length
            ).toBe(START_HAND_SIZE);
        });

        test("Should show active pile card face up", () => {
            const activePileContainer: HTMLElement = container.querySelector(
                '[class*="active-pile"]'
            )!;
            expect(
                activePileContainer.querySelectorAll('[class*="card-front"]')
                    .length
            ).toBe(1);
        });

        test("Should show three player info cards with info", () => {
            expect(
                container.querySelectorAll('[class*="opponent-infocard-root"]')
                    .length
            ).toBe(3);
        });

        test("Should render three enabled buttons if players turn", () => {
            expect(
                screen.getByRole("button", { name: "Play cards" })
            ).toBeEnabled();
            expect(
                screen.getByRole("button", { name: "Draw card" })
            ).toBeEnabled();
            expect(
                screen.getByRole("button", { name: "End turn" })
            ).toBeEnabled();
        });

        test("Draw card button should emit draw_card", () => {
            screen.getByRole("button", { name: "Draw card" }).click();
            expect(mockSocket.emit).toHaveBeenCalledWith("draw_card");
        });

        test("End turn button should emit end_turn", () => {
            screen.getByRole("button", { name: "End turn" }).click();
            expect(mockSocket.emit).toHaveBeenCalledWith("end_turn");
        });

        test("Should switch turn to next player on turn_started", () => {
            act(() => {
                emitEvent("turn_started", { currentPlayerIndex: 1 });
            });
            expect(
                screen.getByRole("button", { name: "Play cards" })
            ).toBeDisabled();
            expect(
                screen.getByRole("button", { name: "Draw card" })
            ).toBeDisabled();
            expect(
                screen.getByRole("button", { name: "End turn" })
            ).toBeDisabled();
        });

        test("Should update hand on hand_update", () => {
            const handContainer: HTMLElement = container.querySelector(
                '[class*="player-hand"]'
            )!;
            const updatedHand = [
                { rank: "7", suit: "hearts" },
                { rank: "Q", suit: "spades" },
                { rank: "A", suit: "clubs" },
                { rank: "10", suit: "diamonds" },
                { rank: "8", suit: "hearts" },
                { rank: "Q", suit: "clubs" },
            ];

            act(() => {
                emitEvent("hand_update", {
                    updatedHand,
                });
            });

            expect(
                handContainer.querySelectorAll('[class*="card-front"]').length
            ).toBe(updatedHand.length);
        });

        test("Should show a toast on effects_applied", () => {
            act(() => {
                emitEvent("effects_applied", {
                    specialEffects: ["SKIP_TURN"],
                    affectedPlayerIndex: 1,
                });
            });
            expect(mockShowToast).toHaveBeenCalledWith({
                level: "warning",
                message: "player2nd has suffered these effects: SKIP_TURN",
            });
        });
    });

    describe("3 oponents, not players turn", () => {
        const roundStartedData = {
            hand: [
                { rank: "7", suit: "hearts" },
                { rank: "Q", suit: "spades" },
                { rank: "A", suit: "clubs" },
                { rank: "10", suit: "diamonds" },
                { rank: "8", suit: "hearts" },
            ],
            activePileTopCard: { rank: "J", suit: "clubs" },
            dealerIndex: 2,
            currentPlayerIndex: 1,
            players: [
                { id: "socket01abc", nickname: "valentyn", score: 0 },
                { id: "socket02def", nickname: "player2nd", score: 15 },
                { id: "socket03ghi", nickname: "player3rd", score: 40 },
            ],
        };

        beforeEach(() => {
            container = renderGameScreen();
            act(() => {
                emitEvent("round_started", roundStartedData);
            });
        });

        test("Should show two player info cards with info", () => {
            expect(
                container.querySelectorAll('[class*="opponent-infocard-root"]')
                    .length
            ).toBe(2);
        });

        test("Should render three disabled buttons if not players turn", () => {
            expect(
                screen.getByRole("button", { name: "Play cards" })
            ).toBeDisabled();
            expect(
                screen.getByRole("button", { name: "Draw card" })
            ).toBeDisabled();
            expect(
                screen.getByRole("button", { name: "End turn" })
            ).toBeDisabled();
        });

        test("Should render new top active pile card and update handCount on cards_played", () => {
            act(() => {
                emitEvent("cards_played", {
                    playerId: "socket02def",
                    handCount: 4,
                    cardsPlayed: [{ rank: "7", suit: "clubs" }],
                    activePileTopCard: { rank: "7", suit: "clubs" },
                });
            });
            const leftPlayerInfoContainer: HTMLElement =
                container.querySelector('[class*="-left"]')!;
            expect(
                leftPlayerInfoContainer.querySelectorAll('[class*="card-back"]')
                    .length
            ).toBe(4);
            const activePileContainer: HTMLElement = container.querySelector(
                '[class*="active-pile"]'
            )!;
            expect(activePileContainer.textContent.includes("7 ♣")).toBe(true);
        });

        test("Should update opponents hand count", () => {
            act(() => {
                emitEvent("card_drawn", {
                    playerId: "socket02def",
                    handCount: 6,
                });
            });
            const leftPlayerInfoContainer: HTMLElement =
                container.querySelector('[class*="-left"]')!;
            expect(
                leftPlayerInfoContainer.querySelectorAll('[class*="card-back"]')
                    .length
            ).toBe(6);
        });
    });
    describe("2 oponents, not players turn", () => {
        const roundStartedData = {
            hand: [
                { rank: "7", suit: "hearts" },
                { rank: "Q", suit: "spades" },
                { rank: "A", suit: "clubs" },
                { rank: "10", suit: "diamonds" },
                { rank: "8", suit: "hearts" },
            ],
            activePileTopCard: { rank: "J", suit: "clubs" },
            dealerIndex: 1,
            currentPlayerIndex: 1,
            players: [
                { id: "socket01abc", nickname: "valentyn", score: 0 },
                { id: "socket02def", nickname: "player2nd", score: 15 },
            ],
        };

        beforeEach(() => {
            container = renderGameScreen();
            act(() => {
                emitEvent("round_started", roundStartedData);
            });
        });

        test("Should show one player info card with info", () => {
            expect(
                container.querySelectorAll('[class*="opponent-infocard-root"]')
                    .length
            ).toBe(1);
        });
    });
});
