import type { CARD_RANKS, CARD_SUITS } from "./consts.js";

export type CardSuit = (typeof CARD_SUITS)[number];
export type CardRank = (typeof CARD_RANKS)[number];
export type SpecialEffect = "TAKE_CARD" | "SKIP_TURN";
export type GamePhase = "PLAYING" | "ROUND_OVER" | "GAME_OVER";

export type JackEndEffect = {
    option: "DOUBLE_ALL" | "MINUS_20";
    count: number;
} | null;

export type SpecialAction = {
    targetIndex: number;
    effects: SpecialEffect[];
};

export type Card = {
    rank: CardRank;
    suit: CardSuit;
};

export type GamePlayer = {
    nickname: string;
    id: string;
    score: number;
    hand: Card[];
    isEliminated: boolean;
};

export type BridgeGameState = {
    currentPhase: GamePhase;
    players: GamePlayer[];
    currentDealerIndex: number;
    currentPlayerIndex: number;
    drawPile: Card[];
    activePile: Card[];
    jackSuit: CardSuit;
    pendingSpecialEffects: SpecialAction[];
    reshuffleCount: number;
    shouldSkipNextPlayer: boolean;
    isPendingSuitDeclaration: boolean;
};

export type LobbyMember = {
    name: string;
    id: string;
    isReady: boolean;
};

export type LobbyRoom = {
    id: string;
    status: "waiting" | "in_progress";
    members: LobbyMember[];
    gameState: BridgeGameState | undefined;
};

export interface ServerToClientEvents {
    room_created: (payload: { roomCode: string }) => void;
    room_joined: (payload: { roomMembers: LobbyMember[] }) => void;
    player_ready_update: (payload: {
        readyPlayerId: string;
        readyPlayers: LobbyMember[];
    }) => void;
    error: (payload: { error: string }) => void;
    game_started: (payload: {
        hand: Card[];
        activePileTopCard: Card;
        dealerIndex: number;
        currentPlayerIndex: number;
    }) => void;
    cards_played: (payload: {
        playerId: string;
        cardsPlayed: Card[];
        activePileTopCard: Card;
        handCount: number;
    }) => void;
    hand_update: (payload: { updatedHand: Card[] }) => void;
    turn_started: (payload: { currentPlayerIndex: number }) => void;
    set_jack_suit: () => void;
    suit_declared: (payload: { suit: CardSuit }) => void;
    can_bridge: () => void;
    bridge_declared: () => void;
    round_won: (payload: { winnerIndex: number }) => void;
    round_ended: () => void; //add payload later
}

export interface ClientToServerEvents {
    create_room: (payload: { playerName: string }) => void;
    end_turn: () => void;
    join_room: (payload: { playerName: string; roomCode: string }) => void;
    player_ready: () => void;
    play_cards: (payload: { cardsToPlay: Card[] }) => void;
    declare_suit: (payload: { suit: CardSuit }) => void;
    declare_bridge: () => void;
}
