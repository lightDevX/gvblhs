import { hashPassword } from "@/lib/auth/password";
import clientPromise from "@/lib/db/mongodb";
import { signJWT } from "@/lib/tokens/jwt";
import { NextRequest, NextResponse } from "next/server";

interface RegisterRequestBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
  tshirtSize?: unknown;
  religion?: unknown;
  customReligion?: unknown;
  batch?: unknown;
  transactionId?: unknown;
  guestsUnder5?: unknown;
  guests5AndAbove?: unknown;
  guestNames?: unknown;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asNonNegativeInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) return Math.max(0, parsed);
  }
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterRequestBody;

    const name = asTrimmedString(body.name);
    const email = asTrimmedString(body.email)?.toLowerCase() ?? "";
    const password = typeof body.password === "string" ? body.password : "";
    const phone = asTrimmedString(body.phone);
    const tshirtSize = asTrimmedString(body.tshirtSize);
    const religion = asTrimmedString(body.religion);
    const customReligion = asTrimmedString(body.customReligion);
    const batch = asTrimmedString(body.batch);
    const transactionId = asTrimmedString(body.transactionId);

    // Guest counts — always integers >= 0, capped at 50
    const guestsUnder5 = Math.min(50, asNonNegativeInt(body.guestsUnder5));
    const guests5AndAbove = Math.min(
      50,
      asNonNegativeInt(body.guests5AndAbove),
    );
    const totalGuests = guestsUnder5 + guests5AndAbove;
    const totalAttendees = 1 + totalGuests;

    // Guest names — array of trimmed strings, matching totalGuests count
    const rawGuestNames = Array.isArray(body.guestNames) ? body.guestNames : [];
    const guestNames: string[] = rawGuestNames
      .slice(0, totalGuests)
      .map((n: unknown) => (typeof n === "string" ? n.trim() : ""));
    while (guestNames.length < totalGuests) guestNames.push("");

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

    if (!batch) {
      return NextResponse.json({ error: "Batch is required" }, { status: 400 });
    }

    if (religion === "Custom" && !customReligion) {
      return NextResponse.json(
        { error: "Custom religion is required" },
        { status: 400 },
      );
    }

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
      phone,
      tshirtSize: tshirtSize || null,
      religion: normalizedReligion,
      customReligion: normalizedCustomReligion,
      category: "student",
      batch,
      transactionId,
      guestsUnder5,
      guests5AndAbove,
      guestNames,
      totalGuests,
      totalAttendees,
      authProvider: "email",
      role: "user",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const userId = userResult.insertedId;

    try {
      await db.collection("students").insertOne({
        userId,
        batch,
        religion: normalizedReligion,
        customReligion: normalizedCustomReligion,
        phone,
        transactionId,
        guestsUnder5,
        guests5AndAbove,
        guestNames,
        totalGuests,
        totalAttendees,
        createdAt: now,
        updatedAt: now,
      });
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
          category: "student",
          batch,
          guestsUnder5,
          guests5AndAbove,
          totalGuests,
          totalAttendees,
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
