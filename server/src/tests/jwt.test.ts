import { describe, expect, test } from "vitest";
import { signToken, verifyToken } from "../functions/jwt.js";

describe("jwt", () => {
    test("signToken should return non-empty string", () => {
        expect(signToken({ userId: "randomThing" }).length).not.toBe(0);
    });
    test("verifyToken should return the signed payload", () => {
        const payload = { userId: "randomThing" };
        const token = signToken(payload);
        const verified = verifyToken(token);
        expect(verified.userId).toBe("randomThing");
    });
    test("verifyToken should throw an error on wrong token", () => {
        const payload = { userId: "randomThing" };
        const token = signToken(payload) + "bla";
        expect(() => verifyToken(token)).toThrow();
    });
    test("verifyToken should throw an error on wrong token", () => {
        const token = "fake-token-bla-bla34";
        expect(() => verifyToken(token)).toThrow();
    });
});
