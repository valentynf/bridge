type CardSuit = "hearts" | "spades" | "diamonds" | "clubs"

type CardRank = "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A"

type PendingEffect = "TAKE_1" | "SKIP_TURN"

type SpecialAction = {
    targetIndex: number
    effect: PendingEffect[]
}

type Card = {
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
