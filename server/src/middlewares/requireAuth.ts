import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../functions/jwt.js";

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    try {
        const { userId } = verifyToken(token);
        req.userId = userId;
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }
};

export default requireAuth;
