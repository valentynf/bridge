import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
    },
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:3000/",
                changeOrigin: true,
            },
            "/socket.io": {
                target: "ws://localhost:3000",
                ws: true,
            },
        },
    },
});
