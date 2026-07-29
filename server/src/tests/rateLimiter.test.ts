import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { createRateLimiter } from "../functions/rateLimiter.js";

describe("createRateLimiter", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test("Should allow first event", () => {
        const { check } = createRateLimiter(2, 1000);

        expect(check("socket01", "draw_card")).toBeTruthy();
    });

    test("Should allow events under the limit within the time window", () => {
        const { check } = createRateLimiter(2, 1000);

        expect(check("socket01", "draw_card")).toBeTruthy();
        expect(check("socket01", "draw_card")).toBeTruthy();
    });

    test("Should reject events over the limit within the time window", () => {
        const { check } = createRateLimiter(2, 1000);

        check("socket01", "draw_card");
        check("socket01", "draw_card");
        expect(check("socket01", "draw_card")).toBeFalsy();
    });

    test("Should allow events after window expired", () => {
        const { check } = createRateLimiter(2, 1000);

        check("socket01", "draw_card");
        check("socket01", "draw_card");
        check("socket01", "draw_card");

        vi.advanceTimersByTime(1001);

        expect(check("socket01", "draw_card")).toBeTruthy();
    });

    test("Should have different budget for different events", () => {
        const { check } = createRateLimiter(2, 1000);
        check("socket01", "draw_card");
        check("socket01", "draw_card");
        check("socket01", "draw_card");
        expect(check("socket01", "end_turn")).toBeTruthy();
    });

    test("Should have different budget for different sockets", () => {
        const { check } = createRateLimiter(2, 1000);
        check("socket01", "draw_card");
        check("socket01", "draw_card");
        check("socket01", "draw_card");
        expect(check("socket02", "draw_card")).toBeTruthy();
    });
});
