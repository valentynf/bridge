import type { RoundPlayer } from "../../shared/types";

export type ClientPlayer = RoundPlayer & { handCount: number };

export type PromptType = "suit_pick" | "bridge" | "jack_bonus" | null;

export type ScreenType = "auth" | "menu" | "lobby" | "game" | "game-over";

export type RoundEndData = {
    winnerName: string;
    playerScores: { nickname: string; score: number }[];
    eliminatedNames: string[];
    reshuffleMultiplier: number;
};

export type GameEndData = {
    winnerName: string;
    finalPlayerScores: { nickname: string; score: number }[];
};

export type AuthUser = {
    id: string;
    email: string;
    nickname: string;
};
