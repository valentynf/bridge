import type { RoundPlayer } from "../../shared/types";

export type ClientPlayer = RoundPlayer & { handCount: number };

export type PromptType = "suit_pick" | "bridge" | "jack_bonus" | null;

export type RoundEndData = {
    winnerName: string;
    playerScores: { nickname: string; score: number }[];
    eliminatedNames: string[];
    reshuffleMultiplier: number;
};
