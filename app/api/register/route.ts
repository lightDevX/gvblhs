import clientPromise from "@/lib/db/mongodb";
import { NextRequest, NextResponse } from "next/server";

const VALID_PAYMENT_METHODS = ["bkash", "nagad", "rocket", "bank", "manual"];
const VALID_TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const PRICE_PER_MEMBER = 800;
const PRICE_PER_GUEST_5PLUS = 500;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Required fields
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const mobile = typeof body.mobile === "string" ? body.mobile.trim() : "";
    const batch = typeof body.batch === "string" ? body.batch.trim() : "";
    const paymentMethod =
      typeof body.paymentMethod === "string"
        ? body.paymentMethod.trim().toLowerCase()
        : "";
    const tShirtSize =
      typeof body.tShirtSize === "string" ? body.tShirtSize.trim() : "";

    // Optional fields
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().toLowerCase()
        : null;
    const religion =
      typeof body.religion === "string" && body.religion.trim()
        ? body.religion.trim()
        : null;
    const customReligion =
      typeof body.customReligion === "string" && body.customReligion.trim()
        ? body.customReligion.trim()
        : null;
    const registeredBy =
      typeof body.registeredBy === "string" && body.registeredBy.trim()
        ? body.registeredBy.trim()
        : "myself";
    const transactionId =
      typeof body.transactionId === "string" && body.transactionId.trim()
        ? body.transactionId.trim()
        : null;

    // Guest counts
    const guestsUnder5 =
      typeof body.guestsUnder5 === "number" &&
      Number.isInteger(body.guestsUnder5) &&
      body.guestsUnder5 >= 0
        ? body.guestsUnder5
        : 0;
    const guests5AndAbove =
      typeof body.guests5AndAbove === "number" &&
      Number.isInteger(body.guests5AndAbove) &&
      body.guests5AndAbove >= 0
        ? body.guests5AndAbove
        : 0;

    // Guest names
    const guestNames: string[] = Array.isArray(body.guestNames)
      ? body.guestNames
          .filter((n: unknown) => typeof n === "string")
          .map((n: string) => n.trim())
      : [];

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 },
      );
    }
    if (!mobile) {
      return NextResponse.json(
        { error: "Mobile number is required" },
        { status: 400 },
      );
    }
    if (!batch) {
      return NextResponse.json(
        { error: "Batch year is required" },
        { status: 400 },
      );
    }
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        {
          error:
            "Invalid payment method. Must be one of: Bkash, Nagad, Rocket, Bank, Manual Payment",
        },
        { status: 400 },
      );
    }
    if (!tShirtSize || !VALID_TSHIRT_SIZES.includes(tShirtSize)) {
      return NextResponse.json(
        {
          error:
            "Invalid T-Shirt size. Must be one of: XS, S, M, L, XL, XXL, XXXL",
        },
        { status: 400 },
      );
    }

    // transactionId required for non-manual payment
    if (paymentMethod !== "manual" && !transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required for this payment method" },
        { status: 400 },
      );
    }

    // Email format validation (if provided)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    const totalGuests = guestsUnder5 + guests5AndAbove;
    const totalAttendees = 1 + totalGuests;
    const amount = PRICE_PER_MEMBER + guests5AndAbove * PRICE_PER_GUEST_5PLUS;
    const resolvedReligion = religion === "Custom" ? customReligion : religion;

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    const databaseName = process.env.MONGO_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);
    const registrations = db.collection("registrations");

    // Check duplicate by mobile
    const existing = await registrations.findOne({ mobile });
    if (existing) {
      return NextResponse.json(
        { error: "This mobile number is already registered" },
        { status: 409 },
      );
    }

    const now = new Date();
    const doc = {
      name,
      mobile,
      email,
      batch,
      religion: resolvedReligion,
      registeredBy,
      guestsUnder5,
      guests5AndAbove,
      guestNames,
      totalGuests,
      totalAttendees,
      tShirtSize,
      paymentMethod,
      transactionId,
      amount,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    const result = await registrations.insertOne(doc);

    return NextResponse.json(
      {
        success: true,
        id: result.insertedId.toString(),
        message: "Registration submitted successfully!",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
