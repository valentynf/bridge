import { useState } from "react";
import apiClient from "../../api/apiClient";
import styles from "./AuthScreen.module.css";
import type { AuthUser } from "../../types";
import { useToast } from "../../hooks/useToast";
import axios from "axios";
import { PLAYER_NAME_REGEX } from "../../../../shared/validations";

type AuthScreenProps = {
    onAuthSuccess: (user: AuthUser) => void;
};

function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
    const [currentTab, setCurrentTab] = useState<"login" | "register">("login");
    const [identifier, setIdentifier] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [nickname, setNickname] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const clearInput = (): void => {
        setIdentifier("");
        setEmail("");
        setNickname("");
        setPassword("");
    };

    const showToast = useToast();

    const onRegisterClick = (): void => {
        setCurrentTab("register");
        clearInput();
    };

    const onLoginClick = (): void => {
        setCurrentTab("login");
        clearInput();
    };

    const handleLoginSubmit = async (
        e: React.SubmitEvent<HTMLFormElement>
    ): Promise<void> => {
        e.preventDefault();
        try {
            const createUserResponse = await apiClient.post("/auth/login", {
                identifier,
                password,
            });
            onAuthSuccess(createUserResponse.data);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const message = err.response?.data?.error || "Login failed";
                showToast({ level: "error", message });
            } else {
                showToast({ level: "error", message: "Unexpected error" });
            }
        }
    };

    const handleRegisterSubmit = async (
        e: React.SubmitEvent<HTMLFormElement>
    ): Promise<void> => {
        e.preventDefault();
        try {
            const registerUserResponse = await apiClient.post(
                "/auth/register",
                {
                    email,
                    nickname,
                    password,
                }
            );
            onAuthSuccess(registerUserResponse.data);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const message =
                    err.response?.data?.error || "Registration failed";
                showToast({ level: "error", message });
            } else {
                showToast({ level: "error", message: "Unexpected error" });
            }
        }
    };

    return (
        <div className={styles["auth-screen-root"]}>
            <div className={styles["auth-root"]}>
                <div className={styles["auth-header"]}>
                    <p onClick={onRegisterClick}>Register</p>
                    <p onClick={onLoginClick}>Login</p>
                </div>
                <div className={styles["auth-form"]}>
                    {currentTab === "login" && (
                        <form
                            className={styles["login-form"]}
                            onSubmit={handleLoginSubmit}
                        >
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <button type="submit">Login</button>
                        </form>
                    )}
                    {currentTab === "register" && (
                        <form
                            className={styles["register-form"]}
                            onSubmit={handleRegisterSubmit}
                        >
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <input
                                type="text"
                                value={nickname}
                                title="Nickname must be 5-12 alphanumeric characters"
                                pattern={PLAYER_NAME_REGEX.source}
                                onChange={(e) => setNickname(e.target.value)}
                            />
                            <input
                                type="password"
                                value={password}
                                minLength={8}
                                title="Password must be min 8 characters long"
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <button type="submit">Register</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AuthScreen;
