import type { SpecialEffect } from "../../shared/types";

export const getColorFromString = (string: string): string => {
    const hue =
        string.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        360;
    return `hsl(${hue}, 60%, 50%)`;
};

export const buildEffectsMessage = (
    name: string,
    effects: SpecialEffect[]
): string => {
    const takeCount = effects.filter((e) => e === "TAKE_CARD").length;
    const skipCount = effects.filter((e) => e === "SKIP_TURN").length;
    const parts: string[] = [];

    if (takeCount > 0) {
        parts.push(`take ${takeCount} card${takeCount > 1 ? "s" : ""}`);
    }
    if (skipCount > 0) {
        parts.push(`skip ${skipCount > 1 ? `${skipCount} turns` : "a turn"}`);
    }

    return `${name} has to ${parts.join(" and ")}`;
};
