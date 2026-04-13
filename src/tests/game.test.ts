import { expect, test } from "vitest";

const sum = (a: number, b: number): number => {
    return a + b;
};

test("dummy test", () => expect(sum(1, 2)).toBe(3));
