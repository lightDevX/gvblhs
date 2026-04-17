import crypto from "crypto";

const HASH_ITERATIONS = 100000;
const HASH_ALGORITHM = "sha256";

/**
 * Hash a password using PBKDF2
 * @param password - The password to hash
 * @returns Hashed password in format: iterations$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(32).toString("hex");

  // Use PBKDF2 for key derivation
  const derivedKey = crypto
    .pbkdf2Sync(password, salt, HASH_ITERATIONS, 64, HASH_ALGORITHM)
    .toString("hex");

  return `${HASH_ITERATIONS}$${salt}$${derivedKey}`;
}

/**
 * Verify a password against its hash
 * @param password - The plain text password to verify
 * @param hash - The hash to verify against
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    const parts = hash.split("$");
    if (parts.length !== 3) {
      return false;
    }

    const iterations = parseInt(parts[0]);
    const salt = parts[1];
    const storedHash = parts[2];

    const derivedKey = crypto
      .pbkdf2Sync(password, salt, iterations, 64, HASH_ALGORITHM)
      .toString("hex");

    return derivedKey === storedHash;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}
