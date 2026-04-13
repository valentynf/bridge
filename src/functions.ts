import type { Card } from "./types.js"
import { CARD_RANKS as cardRanks, CARD_SUITS as cardSuits } from "./consts.js"

export const newDeck = (): Card[] => {
    const newDeck: Card[] = []
    cardRanks.forEach((rank) => {
        for (const suit of cardSuits) {
            newDeck.push({ rank, suit })
        }
    })

    return newDeck
}
