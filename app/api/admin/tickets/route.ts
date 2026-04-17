import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

interface TicketUpdateBody {
  ticketId?: unknown;
  status?: unknown;
}

/**
 * GET /api/admin/tickets
 * Returns all tickets with optional status filter
 * Query params: ?status=pending|paid|rejected (optional)
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
    const ticketsCollection = db.collection("tickets");
    const usersCollection = db.collection("users");

    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const query: any = {};
    if (status && ["pending", "paid", "rejected"].includes(status)) {
      query.paymentStatus = status;
    }

    const tickets = await ticketsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch user info for each ticket
    const ticketsWithUserInfo = await Promise.all(
      tickets.map(async (ticket: any) => {
        const user = await usersCollection.findOne({
          _id: new ObjectId(ticket.userId),
        });

        return {
          id: ticket._id.toString(),
          userId: ticket.userId.toString(),
          ticketId: ticket.ticketId,
          paymentMethod: ticket.paymentMethod || "unknown",
          paymentStatus: ticket.paymentStatus || "pending",
          transactionId: ticket.transactionId || null,
          amount: ticket.amount || 0,
          ticketGenerated: ticket.ticketGenerated || false,
          ticketGeneratedAt: ticket.ticketGeneratedAt || null,
          approvedAt: ticket.approvedAt || null,
          user: {
            name: user?.name || "Unknown",
            email: user?.email || "",
          },
          createdAt:
            ticket.createdAt instanceof Date
              ? ticket.createdAt.toISOString()
              : new Date().toISOString(),
        };
      }),
    );

    return NextResponse.json(ticketsWithUserInfo);
  } catch (error) {
    console.error("Get tickets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/tickets
 * Updates ticket payment status
 * Requires admin role
 * Body: { ticketId: string, status: "pending" | "paid" | "rejected" }
 */
export async function PATCH(request: NextRequest) {
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

    if (payload.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as TicketUpdateBody;
    const ticketId =
      typeof body.ticketId === "string" ? body.ticketId.trim() : null;
    const status = typeof body.status === "string" ? body.status.trim() : null;

    if (!ticketId || !status) {
      return NextResponse.json(
        { error: "ticketId and status are required" },
        { status: 400 },
      );
    }

    if (!["pending", "paid", "rejected"].includes(status)) {
      return NextResponse.json(
        {
          error: 'Invalid status. Must be "pending", "paid", or "rejected"',
        },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(ticketId)) {
      return NextResponse.json(
        { error: "Invalid ticket ID format" },
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
    const ticketsCollection = db.collection("tickets");

    const updateData: any = { paymentStatus: status, updatedAt: new Date() };

    // Track approval
    if (status === "paid") {
      updateData.approvedAt = new Date();
      updateData.approvedBy = new ObjectId(payload.userId);
    } else if (status === "rejected") {
      updateData.approvedAt = new Date();
      updateData.approvedBy = new ObjectId(payload.userId);
    }

    const updatedTicket = await ticketsCollection.findOneAndUpdate(
      { _id: new ObjectId(ticketId) },
      { $set: updateData },
      { returnDocument: "after" },
    );

    if (!updatedTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Ticket status updated to ${status}`,
      ticket: {
        id: updatedTicket._id.toString(),
        ticketId: updatedTicket.ticketId,
        paymentStatus: updatedTicket.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Update ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
