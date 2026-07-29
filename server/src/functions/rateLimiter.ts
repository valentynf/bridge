import type { ClientToServerEvents } from "../../../shared/types.js";

export const createRateLimiter = (maxPerWindow: number, windowMs: number) => {
    const events = new Map<string, { count: number; windowStart: number }>();

    return {
        check: (
            socketId: string,
            eventName: keyof ClientToServerEvents
        ): boolean => {
            const key = `${socketId}:${eventName}`;
            const now = Date.now();
            const entry = events.get(key);

            if (!entry || now - entry.windowStart > windowMs) {
                events.set(key, { count: 1, windowStart: now });
                return true;
            }
            if (entry.count >= maxPerWindow) {
                return false;
            }

            entry.count++;
            return true;
        },
        clearForSocket: (socketId: string): void => {
            for (const key of events.keys()) {
                if (key.startsWith(`${socketId}:`)) {
                    events.delete(key);
                }
            }
        },
    };
};
