import { cleanup, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import GameScreen from "./GameScreen";
import type { Socket } from "socket.io-client";
import { SocketContext } from "../../context/SocketContext";
import { ToastContext } from "../../context/ToastContext";

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

    describe("4 opponents, players turn", () => {
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
            drawPileSize: "medium",
        };

        beforeEach(() => {
            container = renderGameScreen();
            act(() => {
                emitEvent("round_started", roundStartedData);
            });
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

        test("Clicking a card in hand should add selected class", () => {
            const handContainer: HTMLElement = container.querySelector(
                '[class*="player-hand-root"]'
            )!;
            const cardWrapper: HTMLElement = handContainer.querySelector(
                '[class*="card-wrapper"]'
            )!;
            act(() => cardWrapper.click());
            expect(cardWrapper.className).toContain("selected-card");
        });

        test("Clicking a selected card in hand should remove selected class", () => {
            const handContainer: HTMLElement = container.querySelector(
                '[class*="player-hand-root"]'
            )!;
            const cardWrapper: HTMLElement = handContainer.querySelector(
                '[class*="card-wrapper"]'
            )!;
            act(() => cardWrapper.click());
            act(() => cardWrapper.click());
            expect(cardWrapper.className).not.toContain("selected-card");
        });

        test("Play cards button emits play_cards with selected cards", () => {
            const handContainer: HTMLElement = container.querySelector(
                '[class*="player-hand-root"]'
            )!;
            const cardWrapper: HTMLElement = handContainer.querySelector(
                '[class*="card-wrapper"]'
            )!;
            act(() => cardWrapper.click());
            screen.getByText("Play cards").click();
            expect(mockSocket.emit).toHaveBeenCalledWith("play_cards", {
                cardsToPlay: [{ rank: "7", suit: "hearts" }],
            });
        });

        test("No selected cards should remain after play_cards", () => {
            const handContainer: HTMLElement = container.querySelector(
                '[class*="player-hand-root"]'
            )!;
            const cardWrapper: HTMLElement = handContainer.querySelector(
                '[class*="card-wrapper"]'
            )!;
            act(() => cardWrapper.click());
            act(() => screen.getByText("Play cards").click());
            expect(
                handContainer.querySelectorAll('[class*="selected-card"]')
                    .length
            ).toBe(0);
        });

        test("Jack suit prompt with 4 suit buttons should appear on set_jack_suit", () => {
            act(() => {
                emitEvent("set_jack_suit");
            });

            screen.getByRole("button", { name: "♣" });
            screen.getByRole("button", { name: "♦" });
            screen.getByRole("button", { name: "♥" });
            screen.getByRole("button", { name: "♠" });
        });

        test("Jack suit prompt clubs button should emit declare_suit with proper payload", () => {
            act(() => {
                emitEvent("set_jack_suit");
            });

            screen.getByRole("button", { name: "♣" }).click();
            expect(mockSocket.emit).toHaveBeenCalledWith("declare_suit", {
                suit: "clubs",
            });
        });

        test("Jack suit prompt clubs button should emit declare_suit with proper payload", () => {
            act(() => {
                emitEvent("set_jack_suit");
            });

            screen.getByRole("button", { name: "♦" }).click();
            expect(mockSocket.emit).toHaveBeenCalledWith("declare_suit", {
                suit: "diamonds",
            });
        });

        test("Bridge prompt with 2 buttons should appear on can_bridge", () => {
            act(() => {
                emitEvent("can_bridge");
            });

            screen.getByRole("button", { name: "Declare Bridge" });
            screen.getByRole("button", { name: "Skip" });
        });

        test("Bridge prompt declare bridge button should emit declare_bridge", () => {
            act(() => {
                emitEvent("can_bridge");
            });

            screen.getByRole("button", { name: "Declare Bridge" }).click();
            expect(mockSocket.emit).toHaveBeenCalledWith("declare_bridge");
        });

        test("Clicking any button inside prompt should close the prompt", () => {
            act(() => {
                emitEvent("can_bridge");
            });

            act(() => {
                screen.getByRole("button", { name: "Skip" }).click();
            });

            //prompt only appears with buttons, no buttons no prompt
            expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
        });

        test("Jack bonus prompt with 2 buttons should appear on choose_jack_bonus", () => {
            act(() => {
                emitEvent("choose_jack_bonus");
            });

            screen.getByRole("button", { name: "Double all" });
            screen.getByRole("button", { name: "Minus 20" });
        });

        test("Jack bonus prompt Double all button should emit declare_jack_bonus with proper option", () => {
            act(() => {
                emitEvent("choose_jack_bonus");
            });

            screen.getByRole("button", { name: "Double all" }).click();
            expect(mockSocket.emit).toHaveBeenCalledWith("declare_jack_bonus", {
                option: "DOUBLE_ALL",
            });
        });

        test("Jack bonus prompt Minus 20 button should emit declare_jack_bonus with proper option", () => {
            act(() => {
                emitEvent("choose_jack_bonus");
            });

            screen.getByRole("button", { name: "Minus 20" }).click();
            expect(mockSocket.emit).toHaveBeenCalledWith("declare_jack_bonus", {
                option: "MINUS_20",
            });
        });

        test("suit_declared should update Jack suit text", () => {
            act(() => {
                emitEvent("suit_declared", { suit: "diamonds" });
            });
            screen.getByText("Jack suit: diamonds");
        });

        test("bridge_declared should show an announcement", () => {
            act(() => {
                emitEvent("bridge_declared");
            });
            screen.getByText("Bridge declared!");
        });

        test("score_reset should show an announcement", () => {
            act(() => {
                emitEvent("score_reset", { playerIndex: 2 });
            });
            screen.getByText("player3rd score got reset!");
        });

        test("error event should trigger a toast", () => {
            act(() => {
                emitEvent("error", { error: "something is wrong!" });
            });
            expect(mockShowToast).toHaveBeenCalledWith({
                level: "error",
                message: "something is wrong!",
            });
        });

        test("Draw pile container should have medium class on round_start", () => {
            const drawPileContainer: HTMLElement = container.querySelector(
                '[class*="draw-pile"]'
            )!;
            expect(drawPileContainer.className).toContain("medium");
        });

        test("Draw pile size updated and reshuffle announced on pile_reshuffled", () => {
            act(() => {
                emitEvent("pile_reshuffled", {
                    drawPileSize: "large",
                    reshuffleMultiplier: 2,
                });
            });
            const drawPileContainer: HTMLElement = container.querySelector(
                '[class*="draw-pile"]'
            )!;
            screen.getByText("Draw pile reshuffled - X2");
            expect(drawPileContainer.className).toContain("large");
        });
    });

    describe("3 opponents, not players turn", () => {
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

    describe("2 opponents, not players turn", () => {
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
