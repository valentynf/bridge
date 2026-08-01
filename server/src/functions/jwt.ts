import { sign, verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

type TokenPayload = { userId: string };

export const signToken = (payload: TokenPayload) => {
    return sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): TokenPayload => {
    return verify(token, JWT_SECRET) as TokenPayload;
};
