import type { RoundPlayer } from "../../shared/types";

export type ClientPlayer = RoundPlayer & { handCount: number };
export type PromptType = "suit_pick" | "bridge" | "jack_bonus" | null;
