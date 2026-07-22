import { createContext, useState, type ReactNode } from "react";
import styles from "../components/Toast/Toast.module.css";

type Toast = {
    id: string;
    message: string;
    level: "success" | "warning" | "error";
};

type ShowToast = (toast: Omit<Toast, "id">) => void;

const ToastContext = createContext<ShowToast | null>(null);

function ToastContextProvider({ children }: { children: ReactNode }) {
    const [toastArray, setToastArray] = useState<Toast[]>([]);

    const showToast: ShowToast = ({ message, level }) => {
        const newToast: Toast = {
            message,
            level,
            id: Date.now().toString(),
        };
        setToastArray((prev) => [...prev, newToast]);
        setTimeout(() => {
            setToastArray((prev) =>
                prev.filter((toast) => toast.id !== newToast.id)
            );
        }, 2000);
    };

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className={styles["toast-root"]}>
                {toastArray.map((toast) => (
                    <div key={toast.id} className={styles[toast.level]}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export { ToastContextProvider, ToastContext };
