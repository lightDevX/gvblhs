import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/tickets - Get user's tickets
 * Query params: ?status=pending|paid|rejected
 */
export async function GET(request: NextRequest) {
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
    const status = request.nextUrl.searchParams.get("status");

    const query: any = { userId };
    if (status) {
      query.paymentStatus = status;
    }

    const tickets = await ticketsCollection.find(query).toArray();

    return NextResponse.json(tickets, { status: 200 });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tickets - Create a new payment/ticket submission
 * Body: {
 *   paymentMethod: "mfs" | "bank" | "manual",
 *   transactionId?: string,
 *   amount: number
 * }
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

    const body = await request.json();
    const { paymentMethod, transactionId, amount } = body;

    // Validation
    if (!paymentMethod || !["mfs", "bank", "manual"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 },
      );
    }

    // Transaction ID is required for MFS and Bank, optional for Manual
    if (
      (paymentMethod === "mfs" || paymentMethod === "bank") &&
      !transactionId
    ) {
      return NextResponse.json(
        { error: "Transaction ID required for this payment method" },
        { status: 400 },
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Check if user already has a pending ticket
    const existingTicket = await ticketsCollection.findOne({
      userId: new ObjectId(payload.userId),
      paymentStatus: "pending",
    });

    if (existingTicket) {
      return NextResponse.json(
        { error: "You already have a pending payment submission" },
        { status: 400 },
      );
    }

    // Create ticket submission
    const ticket = {
      userId: new ObjectId(payload.userId),
      paymentMethod,
      transactionId: transactionId || null,
      amount,
      paymentStatus: "pending",
      ticketId: null, // Ticket ID will be generated only after admin approval
      ticketGenerated: false,
      ticketGeneratedAt: null,
      ticketGeneratedBy: null,
      approvedAt: null,
      approvedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await ticketsCollection.insertOne(ticket);

    return NextResponse.json(
      {
        success: true,
        paymentId: result.insertedId.toString(),
        message: "Payment submitted successfully. Awaiting admin approval.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create payment submission" },
      { status: 500 },
    );
  }
}
