import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get all contact messages (admin only)
 * GET /api/admin/messages
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
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
    const messagesCollection = db.collection("contact_messages");

    const messages = await messagesCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const formattedMessages = messages.map((msg) => ({
      id: msg._id.toString(),
      name: msg.name,
      email: msg.email,
      subject: msg.subject,
      message: msg.message,
      createdAt: msg.createdAt,
    }));

    return NextResponse.json(formattedMessages, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Get messages error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
