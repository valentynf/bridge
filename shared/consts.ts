export const CARD_RANKS = [
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
] as const;
export const CARD_POINTS = {
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0,
    "10": 10,
    J: 20,
    Q: 10,
    K: 10,
    A: 15,
};
export const CARD_SUITS = ["hearts", "spades", "diamonds", "clubs"] as const;
export const DECK_SIZE = 36;
export const DEFAULT_DEALER_INDEX = 0;
export const CUSTOM_DEALER_INDEX = 2;
export const DEFAULT_PLAYERS_NUMBER = 4;
export const DEALER_CARD_NUMBER = 4;
export const PLAYER_CARD_NUMBER = 5;
export const START_ACTIVE_PILE_SIZE = 1;
