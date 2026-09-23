import bcrypt from "bcryptjs";

const BCRYPT_COST = 10;

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, BCRYPT_COST);
