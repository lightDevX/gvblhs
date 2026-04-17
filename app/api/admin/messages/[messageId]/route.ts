import clientPromise from "@/lib/db/mongodb";
import { verifyJWT } from "@/lib/tokens/jwt";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

interface MessageUpdateBody {
  status?: unknown;
}

/**
 * PATCH /api/admin/messages/[messageId]
 * Update message status (read, replied)
 * Requires admin role
 * Body: { status: "unread" | "read" | "replied" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const { messageId } = await params;
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

    const body = (await request.json()) as MessageUpdateBody;
    const status = typeof body.status === "string" ? body.status.trim() : null;

    if (!status || !["unread", "read", "replied"].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "unread", "read", or "replied"' },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { error: "Invalid message ID format" },
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
    const messagesCollection = db.collection("contact_messages");

    const updatedMessage = await messagesCollection.findOneAndUpdate(
      { _id: new ObjectId(messageId) },
      {
        $set: {
          status,
          updatedAt: new Date(),
          updatedBy: new ObjectId(payload.userId),
        },
      },
      { returnDocument: "after" },
    );

    if (!updatedMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Message status updated to ${status}`,
        data: {
          id: updatedMessage._id.toString(),
          status: updatedMessage.status,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/messages/[messageId]
 * Delete a contact message
 * Requires admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const { messageId } = await params;
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

    if (!ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { error: "Invalid message ID format" },
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
    const messagesCollection = db.collection("contact_messages");

    const result = await messagesCollection.deleteOne({
      _id: new ObjectId(messageId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Message deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
