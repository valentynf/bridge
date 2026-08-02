import express, { type Application } from "express";
import authRouter from "./routes/authRoutes.js";
import cookieParser from "cookie-parser";
import cors from "cors";

const app: Application = express();

app.set("trust proxy", 1);

app.use(
    cors({
        origin: "https://bridge-game-client.netlify.app",
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);

export default app;
