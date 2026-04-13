import type { CARD_RANKS, CARD_SUITS } from "./consts.js"

type CardSuit = (typeof CARD_SUITS)[number]

type CardRank = (typeof CARD_RANKS)[number]

type PendingEffect = "TAKE_1" | "SKIP_TURN"

type SpecialAction = {
    targetIndex: number
    effect: PendingEffect[]
}

export type Card = {
    rank: CardRank
    suit: CardSuit
}

type Player = {
    nickname: string
    score: number
    hand: Card[]
    isEliminated: boolean
}

type GamePhase = "PLAYING" | "ROUND_OVER" | "GAME_OVER"

export type BridgeGameState = {
    currentPhase: GamePhase
    players: Player[]
    currentDealerIndex: number
    currentPlayerIndex: number
    drawPile: Card[]
    activePile: Card[]
    jackSuit: CardSuit | undefined
    pendingSpecialEffects: SpecialAction[]
    reshuffleCount: number
}
