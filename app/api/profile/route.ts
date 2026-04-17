import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

interface ProfileUpdateBody {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  age?: unknown;
  tshirtSize?: unknown;
}

const VALID_TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const VALID_AGE_GROUPS = ["18-25", "26-35", "36-45", "46-55", "56-65", "66+"];

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  // Allow phone numbers with digits, spaces, dashes, plus, and parentheses
  const phoneRegex = /^[\d\s\-+()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * GET /api/profile
 * Returns the current user's profile information
 */
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
        { error: "Database unavailable" },
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

    const updatedAt =
      user.updatedAt instanceof Date
        ? user.updatedAt.toISOString()
        : new Date().toISOString();

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      age: user.age || "",
      tshirtSize: user.tshirtSize || "",
      religion: user.religion || null,
      category: user.category || "guest",
      batch: user.batch || null,
      role: user.role || "user",
      createdAt,
      updatedAt,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/profile
 * Updates the current user's profile information
 * Accepts: name, email, phone, tshirtSize
 */
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

    const body = (await request.json()) as ProfileUpdateBody;
    const name = asTrimmedString(body.name);
    const email = asTrimmedString(body.email);
    const phone = asTrimmedString(body.phone);
    const age = asTrimmedString(body.age);
    const tshirtSize = asTrimmedString(body.tshirtSize);

    // Validate that at least one field is being updated
    if (!name && !email && !phone && !age && !tshirtSize) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Validate phone format if provided
    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 },
      );
    }

    // Validate tshirt size if provided
    if (tshirtSize && !VALID_TSHIRT_SIZES.includes(tshirtSize)) {
      return NextResponse.json(
        {
          error: `Invalid t-shirt size. Must be one of: ${VALID_TSHIRT_SIZES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate age group if provided
    if (age && !VALID_AGE_GROUPS.includes(age)) {
      return NextResponse.json(
        {
          error: `Invalid age group. Must be one of: ${VALID_AGE_GROUPS.join(", ")}`,
        },
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
    const userId = new ObjectId(payload.userId);

    // Check if email is already in use by another user
    if (email) {
      const existingUser = await usersCollection.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email is already in use" },
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
      updateFields.email = email.toLowerCase();
    }

    if (phone) {
      updateFields.phone = phone;
    }

    if (tshirtSize) {
      updateFields.tshirtSize = tshirtSize;
    }

    if (age !== undefined && age !== null) {
      updateFields.age = age;
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

    const updatedAt =
      updatedUser.updatedAt instanceof Date
        ? updatedUser.updatedAt.toISOString()
        : new Date().toISOString();

    return NextResponse.json({
      id: updatedUser._id.toString(),
      name: updatedUser.name || "",
      email: updatedUser.email || "",
      phone: updatedUser.phone || "",
      age: updatedUser.age || "",
      tshirtSize: updatedUser.tshirtSize || "",
      category: updatedUser.category || "guest",
      role: updatedUser.role || "user",
      createdAt,
      updatedAt,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
