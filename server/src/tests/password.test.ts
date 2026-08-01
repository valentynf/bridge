import { describe, expect, test } from "vitest";
import { hashPassword, verifyPassword } from "../functions/password.js";

describe("auth", () => {
    const password = "qwerty123";

    test("Should encrypt string", async () => {
        expect(await hashPassword(password)).not.toBe(password);
    });

    test("Should yield different results with the same parameter", async () => {
        expect(await hashPassword(password)).not.toBe(
            await hashPassword(password)
        );
    });

    test("Should return true for the passwords hash", async () => {
        const passwordHash = await hashPassword(password);
        expect(await verifyPassword(password, passwordHash)).toBeTruthy();
    });

    test("Should false for not matching password and hash", async () => {
        const passwordHash = await hashPassword(password);
        expect(
            await verifyPassword("anotherPassword", passwordHash)
        ).toBeFalsy();
    });
});
