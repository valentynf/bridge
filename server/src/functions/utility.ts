import type { Card, DrawPileSize } from "../../../shared/types.js";

export const generateRoomCode = (): string =>
    Math.random().toString(36).substring(2, 7);

export const areSameCards = (cardOne: Card, cardTwo: Card): boolean =>
    cardOne.rank === cardTwo.rank && cardOne.suit === cardTwo.suit;

export const getDrawPileSize = (drawPileCount: number): DrawPileSize => {
    if (drawPileCount <= 10) {
        return "small";
    }
    if (drawPileCount <= 20) {
        return "medium";
    }
    return "large";
};
