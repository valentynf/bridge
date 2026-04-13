import { describe, expect, test } from "vitest"
import { newDeck, shuffleDeck } from "../functions.js"
import { CARD_SUITS, CARD_RANKS, DECK_SIZE } from "../consts.js"

describe("newDeck", () => {
    const deck = newDeck()

    test("Should have 36 cards", () => {
        expect(deck.length).toBe(DECK_SIZE)
    })

    test("Should have 4 of each rank", () => {
        const cardsPerRank = DECK_SIZE / CARD_RANKS.length
        const deckRanks = deck.map((card) => card.rank)
        for (const rank of CARD_RANKS) {
            const singleRankCards = deckRanks.filter(
                (deckRank) => deckRank === rank
            )
            expect(singleRankCards.length).toBe(cardsPerRank)
        }
    })

    test("Should have 9 of each suit", () => {
        const cardsPerSuit = DECK_SIZE / CARD_SUITS.length
        const deckSuits = deck.map((card) => card.suit)
        for (const suit of CARD_SUITS) {
            const singleSuitCards = deckSuits.filter(
                (deckSuit) => deckSuit === suit
            )
            expect(singleSuitCards.length).toBe(cardsPerSuit)
        }
    })
})

describe("shuffleDeck", () => {
    const unshuffledDeck = newDeck()
    const shuffledDeck = shuffleDeck(unshuffledDeck)

    test("Should have same size", () => {
        expect(shuffledDeck.length).toBe(unshuffledDeck.length)
    })

    test("Should have same cards", () => {
        const sortedUnshuffledDeck = [...unshuffledDeck]
            .map((card) => card.rank + card.suit)
            .sort((a, b) => a.localeCompare(b))
        const sortedShuffledDeck = [...shuffledDeck]
            .map((card) => card.rank + card.suit)
            .sort((a, b) => a.localeCompare(b))
        expect(sortedUnshuffledDeck).toEqual(sortedShuffledDeck)
    })
})
