import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/profiles
 * Returns all user profiles for admin dashboard
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

    // Check if user is admin
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

    const profiles = await usersCollection
      .find({ role: { $ne: "admin" } })
      .project({
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        tshirtSize: 1,
        religion: 1,
        customReligion: 1,
        category: 1,
        batch: 1,
        guestsUnder5: 1,
        guests5AndAbove: 1,
        guestNames: 1,
        totalGuests: 1,
        totalAttendees: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedProfiles = profiles.map((profile: any) => ({
      id: profile._id.toString(),
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || null,
      tshirtSize: profile.tshirtSize || "",
      religion: profile.religion || "",
      customReligion: profile.customReligion || "",
      category: profile.category || "student",
      batch: profile.batch || null,
      guestsUnder5: profile.guestsUnder5 || 0,
      guests5AndAbove: profile.guests5AndAbove || 0,
      guestNames: profile.guestNames || [],
      totalGuests: profile.totalGuests || 0,
      totalAttendees: profile.totalAttendees || 1,
      isVerified: true,
      createdAt:
        profile.createdAt instanceof Date
          ? profile.createdAt.toISOString()
          : new Date().toISOString(),
      updatedAt:
        profile.updatedAt instanceof Date
          ? profile.updatedAt.toISOString()
          : new Date().toISOString(),
    }));

    return NextResponse.json(formattedProfiles);
  } catch (error) {
    console.error("Get profiles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
