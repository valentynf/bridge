import { hash, compare } from "bcrypt";

export const hashPassword = (password: string): Promise<string> => {
    return hash(password, 10);
};

export const verifyPassword = (
    password: string,
    hash: string
): Promise<boolean> => {
    return compare(password, hash);
};
