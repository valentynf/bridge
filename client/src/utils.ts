export const getColorFromString = (string: string): string => {
    const hue =
        string.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        360;
    return `hsl(${hue}, 60%, 50%)`;
};
