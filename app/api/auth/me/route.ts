import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !ObjectId.isValid(payload.userId)) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const client = await clientPromise;

    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable. Please try again later." },
        { status: 503 },
      );
    }

    const databaseName = process.env.MONGO_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({
      _id: new ObjectId(payload.userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const createdAt =
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : new Date().toISOString();

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      age: user.age || "",
      guestCount: user.guestCount || null,
      tshirtSize: user.tshirtSize || "",
      category: user.category || "guest",
      role: user.role || "user",
      createdAt,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
