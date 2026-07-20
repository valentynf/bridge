import { afterEach, describe, test } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Lobby from "./Lobby";
import type { LobbyMember } from "../../../../shared/types";

describe("Lobby", () => {
    const testMembers: LobbyMember[] = [
        { id: "id1", nickname: "player1", isReady: false },
        { id: "id2", nickname: "player2", isReady: false },
        { id: "id3", nickname: "player3", isReady: false },
    ];

    afterEach(() => {
        cleanup();
    });

    test("Two buttons and list of players are rendered", () => {
        render(<Lobby roomCode="roomCode" roomMembers={testMembers} />);

        screen.getByRole("button", { name: "roomCode" });
        screen.getByRole("button", { name: "Ready" });
        for (const member of testMembers) screen.getByText(member.nickname);
    });
});
