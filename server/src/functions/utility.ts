export const generateRoomCode = (): string =>
    Math.random().toString(36).substring(2, 7);
