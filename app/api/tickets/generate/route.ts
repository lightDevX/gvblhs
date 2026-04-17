import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

/**
 * Generate a unique ticket ID
 */
function generateTicketId(): string {
  const prefix = "RN";
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

/**
 * POST /api/tickets/generate
 * Generate a ticket for approved payment
 * User can only generate ticket if payment is approved
 * Body: {} (no body needed, uses authenticated user)
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
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
    const ticketsCollection = db.collection("tickets");

    const userId = new ObjectId(payload.userId);

    // Find user's approved payment that hasn't had a ticket generated yet
    // Handle both missing field and false value for backwards compatibility
    const payment = await ticketsCollection.findOne({
      userId,
      paymentStatus: "paid",
      $or: [
        { ticketGenerated: { $exists: false } },
        { ticketGenerated: false },
      ],
    });

    if (!payment) {
      return NextResponse.json(
        { error: "No approved payment found or ticket already generated" },
        { status: 400 },
      );
    }

    // Generate unique ticket ID
    const ticketId = generateTicketId();

    // Update ticket with generated ticket ID
    const updatedTicket = await ticketsCollection.findOneAndUpdate(
      { _id: payment._id },
      {
        $set: {
          ticketId,
          ticketGenerated: true,
          ticketGeneratedAt: new Date(),
          ticketGeneratedBy: userId,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!updatedTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        ticketId,
        paymentId: updatedTicket._id.toString(),
        message: "Ticket generated successfully!",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating ticket:", error);
    return NextResponse.json(
      { error: "Failed to generate ticket" },
      { status: 500 },
    );
  }
}
