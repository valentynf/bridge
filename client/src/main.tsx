import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { SocketContextProvider } from "./context/SocketContext.tsx";
import { ToastContextProvider } from "./context/ToastContext.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <SocketContextProvider>
            <ToastContextProvider>
                <App />
            </ToastContextProvider>
        </SocketContextProvider>
    </StrictMode>
);
