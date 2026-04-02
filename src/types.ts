type CardSuit = "hearts" | "spades" | "diamonds" | "clubs"

type CardRank = "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A"

export type Card = {
    rank: CardRank
    suit: CardSuit
}
