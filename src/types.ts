import type { CARD_RANKS, CARD_SUITS } from "./consts.js";

export type CardSuit = (typeof CARD_SUITS)[number];

export type CardRank = (typeof CARD_RANKS)[number];

export type SpecialEffect = "TAKE_CARD" | "SKIP_TURN";

export type SpecialAction = {
    targetIndex: number;
    effects: SpecialEffect[];
};

export type Card = {
    rank: CardRank;
    suit: CardSuit;
};

type Player = {
    nickname: string;
    score: number;
    hand: Card[];
    isEliminated: boolean;
};

type GamePhase = "PLAYING" | "ROUND_OVER" | "GAME_OVER";

export type BridgeGameState = {
    currentPhase: GamePhase;
    players: Player[];
    currentDealerIndex: number;
    currentPlayerIndex: number;
    drawPile: Card[];
    activePile: Card[];
    jackSuit: CardSuit;
    pendingSpecialEffects: SpecialAction[];
    reshuffleCount: number;
};
