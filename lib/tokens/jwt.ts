import jwt from "jsonwebtoken";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (
      !decoded ||
      typeof decoded !== "object" ||
      !("userId" in decoded) ||
      !("email" in decoded)
    ) {
      return null;
    }

    const role =
      typeof decoded.role === "string" && decoded.role.trim()
        ? decoded.role
        : "user";

    return {
      userId: String(decoded.userId),
      email: String(decoded.email),
      role,
    };
  } catch {
    return null;
  }
}
