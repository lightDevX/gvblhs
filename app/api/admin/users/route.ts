import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

interface RoleUpdateBody {
  userId?: unknown;
  role?: unknown;
}

const VALID_ROLES = ["user", "admin", "moderator"];

/**
 * GET /api/admin/users
 * Returns all users for admin management
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    if (payload.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    const databaseName = process.env.MONGO_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);
    const usersCollection = db.collection("users");

    const users = await usersCollection
      .find({})
      .project({
        _id: 1,
        name: 1,
        email: 1,
        role: 1,
        createdAt: 1,
        isActive: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedUsers = users.map((user: any) => ({
      id: user._id.toString(),
      name: user.name || "Unknown",
      email: user.email || "",
      role: user.role || "user",
      isActive: user.isActive !== false,
      createdAt:
        user.createdAt instanceof Date
          ? user.createdAt.toISOString()
          : new Date().toISOString(),
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/users/role
 * Updates a user's role
 * Requires admin role
 * Body: { userId: string, role: "user" | "admin" | "moderator" }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    if (payload.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as RoleUpdateBody;
    const userId = typeof body.userId === "string" ? body.userId.trim() : null;
    const role = typeof body.role === "string" ? body.role.trim() : null;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId and role are required" },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 },
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
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

    const databaseName = process.env.MONGO_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);
    const usersCollection = db.collection("users");

    // Check if user exists
    const user = await usersCollection.findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent demoting the last admin
    if (user.role === "admin" && role !== "admin") {
      const adminCount = await usersCollection.countDocuments({
        role: "admin",
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last admin user" },
          { status: 400 },
        );
      }
    }

    const updatedUser = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { role, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
