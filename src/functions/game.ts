import { PLAYER_CARD_NUMBER } from "../consts.js";
import type { Card, CardSuit, SpecialEffect } from "../types.js";
import { shuffleDeck } from "./deck.js";

export const dealCards = (
    dealerIndex: number,
    numberOfPlayers: number,
    shuffledDeck: Card[]
): { hands: Card[][]; drawPile: Card[]; activePile: Card[] } => {
    const hands: Card[][] = new Array(numberOfPlayers)
        .fill(undefined)
        .map(() => []);
    const cardsToDeal = [...shuffledDeck];
    let i = 0;

    while (i < PLAYER_CARD_NUMBER) {
        for (const hand of hands) {
            const dealingCard = cardsToDeal.shift();
            if (dealingCard) hand.push(dealingCard);
        }
        i++;
    }

    const dealerFifthCard = hands[dealerIndex].pop();
    const activePile: Card[] = [];

    if (dealerFifthCard) activePile.push(dealerFifthCard);

    const drawPile: Card[] = [...cardsToDeal];

    return { hands, drawPile, activePile };
};

export const applyPendingEffects = (
    drawPile: Card[],
    activePile: Card[],
    playerHand: Card[],
    pendingEffects: SpecialEffect[]
): {
    updatedDrawPile: Card[];
    updatedHand: Card[];
    updatedActivePile: Card[];
    skipTurn: boolean;
    reshuffled: boolean;
} => {
    const updatedHand = [...playerHand];
    let updatedDrawPile = [...drawPile];
    let updatedActivePile = [...activePile];
    let skipTurn = false;
    let reshuffled = false;
    for (const effect of pendingEffects) {
        if (effect === "TAKE_CARD") {
            const topDrawPileCard = updatedDrawPile.shift();
            if (topDrawPileCard) {
                updatedHand.push(topDrawPileCard);
            } else {
                // if (!reshuffled), implement scenario with empty deck (only 1 card on the table)
                const topActivePileCard = updatedActivePile.shift();
                updatedDrawPile = shuffleDeck(updatedActivePile);
                const topDrawPileCard = updatedDrawPile.shift();
                if (topActivePileCard) updatedActivePile = [topActivePileCard];
                if (topDrawPileCard) updatedHand.push(topDrawPileCard);
                reshuffled = true;
            }
        }
        if (effect === "SKIP_TURN") skipTurn = true;
    }

    return {
        updatedDrawPile,
        updatedHand,
        updatedActivePile,
        skipTurn,
        reshuffled,
    };
};

export const checkCanPlay = (
    activePileTopCard: Card,
    playerHand: Card[],
    jackSuit?: CardSuit
): boolean => {
    if (playerHand.some((card) => card.rank === "J")) return true;
    for (const card of playerHand) {
        if (
            (card.rank === activePileTopCard.rank ||
                card.suit === activePileTopCard.suit) &&
            activePileTopCard.rank !== "J"
        )
            return true;
        if (
            jackSuit &&
            activePileTopCard.rank === "J" &&
            card.suit === jackSuit
        )
            return true;
    }
    return false;
};

export const playCards = (
    playersHand: Card[],
    cardsToPlay: Card[],
    activePile: Card[],
    drawPile: Card[],
    jackSuit: CardSuit
): {
    updatedHand: Card[];
    updatedActivePile: Card[];
    updatedDrawPile: Card[];
    specialEffects: SpecialEffect[];
    reshuffled: boolean;
} => {
    const activePileTopCard = activePile[0];
    let updatedHand: Card[] = [...playersHand];
    let updatedActivePile: Card[] = [...activePile];
    let updatedDrawPile: Card[] = [...drawPile];
    let specialEffects: SpecialEffect[] = [];
    let reshuffled: boolean = false;

    const unchangedData = {
        updatedHand: playersHand,
        updatedActivePile: activePile,
        updatedDrawPile: drawPile,
        specialEffects,
        reshuffled,
    };

    if (cardsToPlay.length === 0) return unchangedData;

    //todo
    if (cardsToPlay.every((card) => card.rank === "6")) {
        const topSixCard = cardsToPlay[0];
        const canCoverSix = playersHand.some(
            (card) =>
                card.rank === "J" ||
                (card.rank !== "6" && card.suit === topSixCard.suit)
        );

        if (canCoverSix) return unchangedData;

        updatedHand = updatedHand.filter(
            (card) =>
                !cardsToPlay.some(
                    (playedCard) =>
                        card.rank === playedCard.rank &&
                        card.suit === playedCard.suit
                )
        );
        updatedActivePile.unshift(...cardsToPlay);

        let hasFoundCoverCard: boolean = false;
        while (!hasFoundCoverCard) {
            const drawPileTopCard = updatedDrawPile.shift();
            if (drawPileTopCard) {
                if (
                    drawPileTopCard.rank === "J" ||
                    drawPileTopCard.suit === topSixCard.suit
                ) {
                    updatedActivePile.unshift(drawPileTopCard);
                    hasFoundCoverCard = true;
                } else {
                    updatedHand.push(drawPileTopCard);
                }
            } else {
                const topActivePileCard = updatedActivePile.shift();
                updatedDrawPile = shuffleDeck(updatedActivePile);
                if (topActivePileCard) updatedActivePile = [topActivePileCard];
                reshuffled = true;
            }
        }
        return {
            updatedHand,
            updatedActivePile,
            updatedDrawPile,
            specialEffects,
            reshuffled,
        };
    }
    // we need to remember about enforcement to play
    // i.e. if user plays only 6, before drawing cards, we should check his hand,
    // if there's a way to cover it, we return same data (will show some error on
    // front end saying cover the 6 right away or play another hand)

    if (cardsToPlay.length === 1) {
        if (activePileTopCard.rank === "J") {
            if (!checkCanPlay(activePileTopCard, cardsToPlay, jackSuit))
                return unchangedData;
        } else if (!checkCanPlay(activePileTopCard, cardsToPlay))
            return unchangedData;

        const matchesByJackSuit =
            activePileTopCard.rank === "J" && cardsToPlay[0].suit === jackSuit;
        const matchesByRank = cardsToPlay[0].rank === activePileTopCard.rank;
        const matchesBySuit = cardsToPlay[0].suit === activePileTopCard.suit;
        const isJackCard = cardsToPlay[0].rank === "J";
        if (matchesByJackSuit || matchesByRank || matchesBySuit || isJackCard) {
            updatedHand = updatedHand.filter(
                (card) =>
                    !(
                        card.rank === cardsToPlay[0].rank &&
                        card.suit === cardsToPlay[0].suit
                    )
            );
            updatedActivePile.unshift(cardsToPlay[0]);
        }
    }

    if (cardsToPlay.length > 1) {
        const bottomCardIndex = cardsToPlay.length - 1;
        if (activePileTopCard.rank === "J") {
            if (
                !checkCanPlay(
                    activePileTopCard,
                    [cardsToPlay[bottomCardIndex]],
                    jackSuit
                )
            )
                return unchangedData;
        } else if (
            !checkCanPlay(activePileTopCard, [cardsToPlay[bottomCardIndex]])
        )
            return unchangedData;

        const matchesByJackSuit =
            activePileTopCard.rank === "J" &&
            cardsToPlay[bottomCardIndex].suit === jackSuit;
        const matchesByRank =
            cardsToPlay[bottomCardIndex].rank === activePileTopCard.rank;
        const matchesBySuit =
            cardsToPlay[bottomCardIndex].suit === activePileTopCard.suit;
        const isJackCard = cardsToPlay[bottomCardIndex].rank === "J";
        const areOfTheSameRank = cardsToPlay.every(
            (card) => card.rank === cardsToPlay[bottomCardIndex].rank
        );

        if (areOfTheSameRank) {
            if (
                matchesByJackSuit ||
                matchesByRank ||
                matchesBySuit ||
                isJackCard
            ) {
                updatedHand = updatedHand.filter(
                    (card) =>
                        !cardsToPlay.some(
                            (playedCard) =>
                                card.rank === playedCard.rank &&
                                card.suit === playedCard.suit
                        )
                );
                updatedActivePile.unshift(...cardsToPlay);
            }
        } else if (cardsToPlay[bottomCardIndex].rank === "6") {
            // case when 6 is played together with the card(s) that can cover it
            const rankSixCards: Card[] = cardsToPlay.filter(
                (card) => card.rank === "6"
            );
            const coverCards: Card[] = cardsToPlay.filter(
                (card) => card.rank !== "6"
            );
            const firstCoverCard: Card = coverCards[coverCards.length - 1];
            const areSameRankCoverCards: boolean = coverCards.every(
                (card) => card.rank === firstCoverCard.rank
            );
            const canCoverSix: boolean =
                rankSixCards[0].suit === firstCoverCard.suit ||
                firstCoverCard.rank === "J";
            if (canCoverSix && areSameRankCoverCards) {
                updatedHand = updatedHand.filter(
                    (card) =>
                        !cardsToPlay.some(
                            (playedCard) =>
                                card.rank === playedCard.rank &&
                                card.suit === playedCard.suit
                        )
                );
                updatedActivePile.unshift(...cardsToPlay);
            }
        } else {
            return unchangedData;
        }
    }

    for (const card of cardsToPlay) {
        if (card.rank === "7") specialEffects.push("TAKE_CARD");
        if (card.rank === "8")
            specialEffects.push("TAKE_CARD", "TAKE_CARD", "SKIP_TURN");
        if (card.rank === "A") specialEffects.push("SKIP_TURN");
    }
    /* since distributing As and 8s across different players is not a v1 feature,
    we stick to 1 SKIP_TURN, because effects will always affect next player only */
    if (specialEffects.some((effect) => effect === "SKIP_TURN")) {
        specialEffects = specialEffects.filter(
            (effect) => effect === "TAKE_CARD"
        );
        specialEffects.push("SKIP_TURN");
    }

    return {
        updatedHand,
        updatedActivePile,
        updatedDrawPile,
        specialEffects,
        reshuffled,
    };
};
