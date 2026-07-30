import { Router } from "express";
import z from "zod";
import { hashPassword, verifyPassword } from "../functions/auth.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { PLAYER_NAME_REGEX } from "../../../shared/validations.js";
import { eq, or } from "drizzle-orm";

const router = Router();

const registerSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
    nickname: z.string().regex(PLAYER_NAME_REGEX),
});

const loginSchema = z.object({
    identifier: z.string().min(5),
    password: z.string().min(8),
});

router.post("/login", async (req, res) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid input" });
    }
    const { identifier, password } = parseResult.data;
    try {
        const [user] = await db
            .select()
            .from(users)
            .where(
                or(eq(users.email, identifier), eq(users.nickname, identifier))
            );
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const isProperPassword = await verifyPassword(
            password,
            user.passwordHash
        );
        if (!isProperPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        return res
            .status(200)
            .json({ id: user.id, email: user.email, nickname: user.nickname });
    } catch {
        return res.status(500).json({
            error: "Something went wrong when logging in",
        });
    }
});

router.post("/register", async (req, res) => {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid input" });
    }
    const { email, password, nickname } = parseResult.data;
    const passwordHash = await hashPassword(password);
    try {
        const [newUser] = await db
            .insert(users)
            .values({ email, passwordHash, nickname })
            .returning({
                id: users.id,
                email: users.email,
                nickname: users.nickname,
            });
        return res.status(201).json(newUser);
    } catch (error) {
        if (
            error instanceof Error &&
            "cause" in error &&
            error.cause instanceof Error &&
            "code" in error.cause &&
            error.cause.code === "23505"
        ) {
            return res
                .status(409)
                .json({ error: "Email or nickname already taken" });
        }
        return res.status(500).json({
            error: "Something went wrong when registering a new user",
        });
    }
});

export default router;
