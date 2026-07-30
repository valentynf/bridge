import { describe, beforeEach, afterAll, test, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

describe("auth routes", () => {
    beforeEach(async () => {
        await db.delete(users);
    });

    afterAll(async () => {
        await db.delete(users);
    });

    test("POST /register — should create user and return 201", async () => {
        const response = await request(app).post("/api/auth/register").send({
            email: "test@test.com",
            password: "password123",
            nickname: "testuser",
        });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            id: expect.any(String),
            email: "test@test.com",
            nickname: "testuser",
        });
    });

    test("POST /register — invalid input - should return 400", async () => {
        const response = await request(app).post("/api/auth/register").send({
            email: "test5t.com",
            password: "pa",
            nickname: "testusertest",
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: "Invalid input" });
    });

    test("POST /register — existing email - should return 409", async () => {
        await request(app).post("/api/auth/register").send({
            email: "test@test.com",
            password: "password123",
            nickname: "testuser",
        });

        const response = await request(app).post("/api/auth/register").send({
            email: "test@test.com",
            password: "qwerytyd123",
            nickname: "testuser1",
        });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
            error: "Email or nickname already taken",
        });
    });

    test("POST /login - should return 200 and user object", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@test.com",
                password: "password123",
                nickname: "testuser",
            });
        const { id } = registerResponse.body;
        const response = await request(app).post("/api/auth/login").send({
            identifier: "testuser",
            password: "password123",
        });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            id,
            nickname: "testuser",
            email: "test@test.com",
        });
    });

    test("POST /login - wrong password - should return 401 and error", async () => {
        await request(app).post("/api/auth/register").send({
            email: "test@test.com",
            password: "password123",
            nickname: "testuser",
        });
        const response = await request(app).post("/api/auth/login").send({
            identifier: "testuser",
            password: "password12",
        });
        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            error: "Invalid credentials",
        });
    });

    test("POST /login - non-exsitent user - should return 401 and error", async () => {
        const response = await request(app).post("/api/auth/login").send({
            identifier: "testuser",
            password: "password12",
        });
        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            error: "Invalid credentials",
        });
    });
});
