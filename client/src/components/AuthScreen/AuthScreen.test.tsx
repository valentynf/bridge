import {
    cleanup,
    render,
    screen,
    act,
    fireEvent,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AuthScreen from "./AuthScreen";
import apiClient from "../../api/apiClient";
import { ToastContext } from "../../context/ToastContext";

vi.mock("../../api/apiClient");

describe("AuthScreen", () => {
    const mockOnAuthSuccess = vi.fn();
    const mockShowToast = vi.fn();
    let container: HTMLElement;

    const renderAuthScreen = () => {
        const { container } = render(
            <ToastContext.Provider value={mockShowToast}>
                <AuthScreen onAuthSuccess={mockOnAuthSuccess} />
            </ToastContext.Provider>
        );
        return container;
    };

    beforeEach(() => {
        container = renderAuthScreen();
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    test("Should render login form by default", () => {
        screen.getByRole("button", { name: "Login" });
    });

    test("Should switch to register form on registration click", () => {
        act(() => {
            screen.getByText("Register").click();
        });
        screen.getByRole("button", { name: "Register" });
    });

    test("Should trigger onAuthSuccess with user data on successful login ", async () => {
        const fakeUser = { id: "1", email: "x@y.com", nickname: "testuser" };
        vi.mocked(apiClient.post).mockResolvedValue({ data: fakeUser });

        const inputs = container.querySelectorAll("input");
        const identifierInput = inputs[0] as HTMLInputElement;
        const passwordInput = inputs[1] as HTMLInputElement;

        fireEvent.change(identifierInput, { target: { value: "testuser" } });
        fireEvent.change(passwordInput, { target: { value: "password123" } });

        await act(async () => {
            screen.getByRole("button", { name: "Login" }).click();
        });

        expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
            identifier: "testuser",
            password: "password123",
        });
        expect(mockOnAuthSuccess).toHaveBeenCalledWith(fakeUser);
    });

    test("Should trigger onAuthSuccess with user data on successful register ", async () => {
        act(() => {
            screen.getByText("Register").click();
        });
        const fakeUser = { id: "1", email: "x@y.com", nickname: "testuser" };
        vi.mocked(apiClient.post).mockResolvedValue({ data: fakeUser });

        const inputs = container.querySelectorAll("input");
        const emailInput = inputs[0] as HTMLInputElement;
        const nicknameInput = inputs[1] as HTMLInputElement;
        const passwordInput = inputs[2] as HTMLInputElement;

        fireEvent.change(emailInput, { target: { value: "x@y.com" } });
        fireEvent.change(nicknameInput, { target: { value: "testuser" } });
        fireEvent.change(passwordInput, { target: { value: "password123" } });

        await act(async () => {
            screen.getByRole("button", { name: "Register" }).click();
        });

        expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
            email: "x@y.com",
            nickname: "testuser",
            password: "password123",
        });
        expect(mockOnAuthSuccess).toHaveBeenCalledWith(fakeUser);
    });

    test("Should show toast on failed login", async () => {
        const error = {
            isAxiosError: true,
            response: { data: { error: "Invalid credentials" } },
        };
        vi.mocked(apiClient.post).mockRejectedValue(error);

        const inputs = container.querySelectorAll("input");
        const identifierInput = inputs[0] as HTMLInputElement;
        const passwordInput = inputs[1] as HTMLInputElement;

        fireEvent.change(identifierInput, { target: { value: "testuser" } });
        fireEvent.change(passwordInput, { target: { value: "wrongpass" } });

        await act(async () => {
            screen.getByRole("button", { name: "Login" }).click();
        });

        expect(mockOnAuthSuccess).not.toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith({
            level: "error",
            message: "Invalid credentials",
        });
    });

    test("Should show toast on failed registration", async () => {
        const error = {
            isAxiosError: true,
            response: { data: { error: "Invalid credentials" } },
        };
        vi.mocked(apiClient.post).mockRejectedValue(error);

        act(() => screen.getByText("Register").click());

        const inputs = container.querySelectorAll("input");
        const emailInput = inputs[0] as HTMLInputElement;
        const nicknameInput = inputs[1] as HTMLInputElement;
        const passwordInput = inputs[2] as HTMLInputElement;

        fireEvent.change(emailInput, { target: { value: "x@y.com" } });
        fireEvent.change(nicknameInput, { target: { value: "testuser" } });
        fireEvent.change(passwordInput, { target: { value: "password123" } });

        await act(async () => {
            screen.getByRole("button", { name: "Register" }).click();
        });

        expect(mockOnAuthSuccess).not.toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith({
            level: "error",
            message: "Invalid credentials",
        });
    });
});
