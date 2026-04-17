import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  const payload = await verifyJWT(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

/** GET /api/admin/registrations — list all registrations */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    const db = client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");
    const registrations = await db
      .collection("registrations")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = registrations.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      mobile: r.mobile,
      email: r.email || null,
      batch: r.batch,
      religion: r.religion || null,
      guestsUnder5: r.guestsUnder5 || 0,
      guests5AndAbove: r.guests5AndAbove || 0,
      guestNames: r.guestNames || [],
      totalGuests: r.totalGuests || 0,
      totalAttendees: r.totalAttendees || 1,
      tShirtSize: r.tShirtSize || null,
      paymentMethod: r.paymentMethod || null,
      transactionId: r.transactionId || null,
      amount: r.amount || 0,
      status: r.status || "pending",
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** PATCH /api/admin/registrations — update registration status */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 },
      );
    }

    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    const db = client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");
    const result = await db
      .collection("registrations")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: "after" },
      );

    if (!result) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    console.error("Error updating registration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
