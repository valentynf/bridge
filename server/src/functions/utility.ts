import type { Card } from "../../../shared/types.js";

export const generateRoomCode = (): string =>
    Math.random().toString(36).substring(2, 7);

export const areSameCards = (cardOne: Card, cardTwo: Card): boolean =>
    cardOne.rank === cardTwo.rank && cardOne.suit === cardTwo.suit;
