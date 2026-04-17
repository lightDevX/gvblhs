import { verifyPassword } from "@/lib/auth/password";
import clientPromise from "@/lib/db/mongodb";
import { VALID_ROLES } from "@/lib/permissions";
import { signJWT } from "@/lib/tokens/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const db = client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");
    const user = await db.collection("users").findOne({ email });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!VALID_ROLES.includes(user.role as (typeof VALID_ROLES)[number])) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Update lastLoginAt
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } },
    );

    const token = await signJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name || "",
        email: user.email,
        role: user.role,
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
        fullAccess: user.fullAccess === true,
        mustChangePassword: user.mustChangePassword === true,
        isActive: user.isActive !== false,
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : new Date().toISOString(),
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
