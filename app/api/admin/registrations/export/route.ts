import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  const payload = await verifyJWT(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

/** GET /api/admin/registrations/export?batch=2005&format=pdf */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batch = searchParams.get("batch");

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    const db = client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");
    const filter: Record<string, string> = {};
    if (batch && batch !== "all") {
      filter.batch = batch;
    }

    const registrations = await db
      .collection("registrations")
      .find(filter)
      .sort({ batch: 1, name: 1 })
      .toArray();

    // Return JSON data for client-side PDF generation
    const data = registrations.map((r) => ({
      name: r.name || "",
      mobile: r.mobile || "",
      email: r.email || "",
      batch: r.batch || "",
      guestsUnder5: r.guestsUnder5 || 0,
      guests5AndAbove: r.guests5AndAbove || 0,
      totalGuests: r.totalGuests || 0,
      totalAttendees: r.totalAttendees || 1,
      tShirtSize: r.tShirtSize || "",
      paymentMethod: r.paymentMethod || "",
      transactionId: r.transactionId || "",
      amount: r.amount || 0,
      status: r.status || "pending",
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString().split("T")[0]
          : typeof r.createdAt === "string"
            ? r.createdAt.split("T")[0]
            : "",
    }));

    return NextResponse.json({
      registrations: data,
      batch: batch || "all",
      total: data.length,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
