import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { name, email } = body;

    const client = await clientPromise;
    const databaseName = process.env.NEXT_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);
    const usersCollection = db.collection("users");

    // Check if trying to update email to one that already exists
    if (email && email !== payload.email) {
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 },
        );
      }
    }

    // Update user
    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(payload.userId) },
      {
        $set: {
          ...(name && { name }),
          ...(email && { email }),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!result || !result.value) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: result.value._id.toString(),
      name: result.value.name,
      email: result.value.email,
      role: result.value.role || "user",
      createdAt: result.value.createdAt?.toISOString(),
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
