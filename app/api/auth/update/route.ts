import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

interface UpdateUserRequestBody {
  name?: unknown;
  email?: unknown;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function PUT(request: NextRequest) {
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

    const body = (await request.json()) as UpdateUserRequestBody;
    const name = asTrimmedString(body.name);
    const email = asTrimmedString(body.email)?.toLowerCase() ?? null;

    if (!name && !email) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
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
    const userId = new ObjectId(payload.userId);

    if (email) {
      const existingUser = await usersCollection.findOne({
        email,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 },
        );
      }
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name) {
      updateFields.name = name;
    }

    if (email) {
      updateFields.email = email;
    }

    const updatedUser = await usersCollection.findOneAndUpdate(
      { _id: userId },
      { $set: updateFields },
      { returnDocument: "after" },
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const createdAt =
      updatedUser.createdAt instanceof Date
        ? updatedUser.createdAt.toISOString()
        : new Date().toISOString();

    return NextResponse.json({
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role || "user",
      createdAt,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
