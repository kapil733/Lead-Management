import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) {
    return "Password must be at least 10 characters";
  }
  if (!/\d/.test(password)) {
    return "Password must include at least one number";
  }
  return null;
}
