import { hashPassword } from "@/lib/auth/password";
import clientPromise from "@/lib/db/mongodb";
import { signJWT } from "@/lib/tokens/jwt";
import { NextRequest, NextResponse } from "next/server";

interface RegisterRequestBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
  age?: unknown;
  guestCount?: unknown;
  tshirtSize?: unknown;
  religion?: unknown;
  customReligion?: unknown;
  category?: unknown;
  batch?: unknown;
  transactionId?: unknown;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterRequestBody;

    const name = asTrimmedString(body.name);
    const email = asTrimmedString(body.email)?.toLowerCase() ?? "";
    const password = typeof body.password === "string" ? body.password : "";
    const phone = asTrimmedString(body.phone);
    const age = asTrimmedString(body.age);
    const tshirtSize = asTrimmedString(body.tshirtSize);
    const religion = asTrimmedString(body.religion);
    const customReligion = asTrimmedString(body.customReligion);
    const batch = asTrimmedString(body.batch);
    const transactionId = asTrimmedString(body.transactionId);

    // Parse guestCount
    let guestCount: number | null = null;
    if (typeof body.guestCount === "number") {
      guestCount = body.guestCount;
    } else if (typeof body.guestCount === "string") {
      const parsed = parseInt(body.guestCount);
      if (!isNaN(parsed)) {
        guestCount = parsed;
      }
    }

    const requestedCategory =
      typeof body.category === "string" ? body.category : "guest";
    if (requestedCategory !== "student" && requestedCategory !== "guest") {
      return NextResponse.json(
        { error: "Category must be student or guest" },
        { status: 400 },
      );
    }

    const category = requestedCategory;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    if (category === "student" && !batch) {
      return NextResponse.json(
        { error: "Batch is required for student registration" },
        { status: 400 },
      );
    }

    if (category === "guest" && !age) {
      return NextResponse.json(
        { error: "Age group is required for guest registration" },
        { status: 400 },
      );
    }

    if (category === "guest" && !guestCount) {
      return NextResponse.json(
        { error: "Guest count is required for guest registration" },
        { status: 400 },
      );
    }

    if (
      category === "guest" &&
      guestCount &&
      (guestCount < 1 || guestCount > 100)
    ) {
      return NextResponse.json(
        { error: "Guest count must be between 1 and 100" },
        { status: 400 },
      );
    }

    // Validate age group if provided
    const VALID_AGE_GROUPS = [
      "18-25",
      "26-35",
      "36-45",
      "46-55",
      "56-65",
      "66+",
    ];
    if (age && !VALID_AGE_GROUPS.includes(age)) {
      return NextResponse.json(
        {
          error: `Invalid age group. Must be one of: ${VALID_AGE_GROUPS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (religion === "Custom" && !customReligion) {
      return NextResponse.json(
        { error: "Custom religion is required" },
        { status: 400 },
      );
    }

    // Validate tshirtSize if provided
    const VALID_TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    if (tshirtSize && !VALID_TSHIRT_SIZES.includes(tshirtSize)) {
      return NextResponse.json(
        {
          error: `Invalid t-shirt size. Must be one of: ${VALID_TSHIRT_SIZES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const normalizedReligion =
      religion === "Custom" ? customReligion : religion;
    const normalizedCustomReligion =
      religion === "Custom" ? customReligion : null;

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

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);
    const now = new Date();

    const userResult = await usersCollection.insertOne({
      name,
      email,
      password: hashedPassword,
      age: category === "guest" ? age : null,
      guestCount: category === "guest" ? guestCount : null,
      phone,
      tshirtSize: tshirtSize || null,
      religion: normalizedReligion,
      customReligion: normalizedCustomReligion,
      category,
      batch: category === "student" ? batch : null,
      transactionId,
      authProvider: "email",
      role: "user",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const userId = userResult.insertedId;

    try {
      if (category === "student") {
        await db.collection("students").insertOne({
          userId,
          batch,
          religion: normalizedReligion,
          customReligion: normalizedCustomReligion,
          phone,
          transactionId,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db.collection("guests").insertOne({
          age,
          guestCount,
          userId,
          religion: normalizedReligion,
          customReligion: normalizedCustomReligion,
          phone,
          transactionId,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (profileError) {
      await usersCollection.deleteOne({ _id: userId });
      throw profileError;
    }

    const token = await signJWT({
      userId: userId.toString(),
      email,
      role: "user",
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: userId.toString(),
          name,
          email,
          role: "user",
          category,
          createdAt: now.toISOString(),
        },
      },
      { status: 201 },
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
