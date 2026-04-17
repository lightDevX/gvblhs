// Server-side helper: verify JWT + load full user record from DB.
// Re-used across all admin API routes.

import clientPromise from "@/lib/db/mongodb";
import { hasPermission, VALID_ROLES } from "@/lib/permissions";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export interface AuthAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  fullAccess: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
}

/**
 * Verify JWT cookie, load the user from DB, and return their full admin record.
 * Returns `null` if unauthenticated, inactive, or not an admin role.
 */
export async function getAuthAdmin(
  request: NextRequest,
): Promise<AuthAdmin | null> {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  const client = await clientPromise;
  if (!client) return null;

  const db = client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(payload.userId) });
  if (!user) return null;
  if (user.isActive === false) return null;
  if (!VALID_ROLES.includes(user.role as (typeof VALID_ROLES)[number]))
    return null;

  return {
    id: user._id.toString(),
    email: user.email as string,
    name: (user.name as string) || "",
    role: user.role as string,
    permissions: Array.isArray(user.permissions)
      ? (user.permissions as string[])
      : [],
    fullAccess: user.fullAccess === true,
    mustChangePassword: user.mustChangePassword === true,
    isActive: user.isActive !== false,
  };
}

/**
 * Convenience: get admin AND verify a specific permission.
 * Returns { admin, error } — if error is set, return it directly from the route handler.
 */
export async function requirePermission(
  request: NextRequest,
  permission: string,
): Promise<{ admin: AuthAdmin | null; error: NextResponse | null }> {
  const admin = await getAuthAdmin(request);
  if (!admin)
    return {
      admin: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  if (admin.mustChangePassword)
    return {
      admin: null,
      error: NextResponse.json(
        { error: "Password change required" },
        { status: 403 },
      ),
    };
  if (
    !hasPermission(admin.role, admin.fullAccess, admin.permissions, permission)
  )
    return {
      admin: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  return { admin, error: null };
}
