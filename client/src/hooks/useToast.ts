import { useContext } from "react";
import { ToastContext } from "../context/ToastContext";

export const useToast = () => {
    const showToast = useContext(ToastContext);
    if (!showToast) {
        throw new Error("showToast must be used within ToastContextProvider");
    }
    return showToast;
};
