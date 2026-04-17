import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getAuthAdmin } from "@/lib/auth/require-admin";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation are required" },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return NextResponse.json(
        { error: "Password must include uppercase, lowercase, and a number" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    const db = client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(admin.id) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent reuse of the same password
    if (user.password) {
      const isSame = await verifyPassword(newPassword, user.password);
      if (isSame) {
        return NextResponse.json(
          { error: "New password must be different from the current password" },
          { status: 400 },
        );
      }
    }

    const hashed = await hashPassword(newPassword);

    await db.collection("users").updateOne(
      { _id: new ObjectId(admin.id) },
      {
        $set: {
          password: hashed,
          mustChangePassword: false,
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
