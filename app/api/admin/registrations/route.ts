import { requirePermission } from "@/lib/auth/require-admin";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES = ["pending", "approved", "rejected"];
const VALID_PAYMENT_METHODS = ["bkash", "nagad", "rocket", "bank", "manual"];
const VALID_TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const PRICE_PER_MEMBER = 800;
const PRICE_PER_GUEST_5PLUS = 500;

function getDb(client: NonNullable<Awaited<typeof clientPromise>>) {
  return client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function formatRegistration(r: Record<string, unknown>) {
  return {
    id: (r._id as ObjectId).toString(),
    name: r.name as string,
    mobile: r.mobile as string,
    email: (r.email as string) || null,
    batch: r.batch as string,
    religion: (r.religion as string) || null,
    guestsUnder5: (r.guestsUnder5 as number) || 0,
    guests5AndAbove: (r.guests5AndAbove as number) || 0,
    guestNames: (r.guestNames as string[]) || [],
    totalGuests: (r.totalGuests as number) || 0,
    totalAttendees: (r.totalAttendees as number) || 1,
    tShirtSize: (r.tShirtSize as string) || null,
    paymentMethod: (r.paymentMethod as string) || null,
    registeredBy: (r.registeredBy as string) || null,
    transactionId: (r.transactionId as string) || null,
    amount: (r.amount as number) || 0,
    status: (r.status as string) || "pending",
    rejectionReason: (r.rejectionReason as string) || null,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : (r.createdAt as string),
  };
}

/** GET /api/admin/registrations — list all registrations */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, "registrations.view");
    if (error) return error;

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    const db = getDb(client);
    const registrations = await db
      .collection("registrations")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(registrations.map(formatRegistration));
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** PATCH /api/admin/registrations — update status OR edit full registration */
export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, "registrations.edit");
    if (error) return error;

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string" || !isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Valid registration ID is required" },
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

    const db = getDb(client);
    const collection = db.collection("registrations");

    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    // Status-only update (with optional rejectionReason)
    const nonMetaKeys = Object.keys(body).filter(
      (k) => k !== "id" && k !== "status" && k !== "rejectionReason",
    );
    if (body.status && nonMetaKeys.length === 0) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      const updateFields: Record<string, unknown> = {
        status: body.status,
        updatedAt: new Date(),
      };

      if (body.status === "rejected" && body.rejectionReason) {
        updateFields.rejectionReason = String(body.rejectionReason)
          .trim()
          .slice(0, 500);
      }
      if (body.status === "pending" || body.status === "approved") {
        updateFields.rejectionReason = null;
      }

      await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateFields },
        { returnDocument: "after" },
      );

      return NextResponse.json({ success: true, status: body.status });
    }

    // Full edit
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name)
        return NextResponse.json(
          { error: "Name is required" },
          { status: 400 },
        );
      update.name = name;
    }

    if (body.mobile !== undefined) {
      const mobile = String(body.mobile).trim();
      if (!mobile)
        return NextResponse.json(
          { error: "Mobile is required" },
          { status: 400 },
        );
      const dup = await collection.findOne({
        mobile,
        _id: { $ne: new ObjectId(id) },
      });
      if (dup)
        return NextResponse.json(
          { error: "Mobile number already registered" },
          { status: 409 },
        );
      update.mobile = mobile;
    }

    if (body.email !== undefined) {
      if (body.email) {
        const email = String(body.email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return NextResponse.json(
            { error: "Invalid email format" },
            { status: 400 },
          );
        }
        update.email = email;
      } else {
        update.email = null;
      }
    }

    if (body.batch !== undefined) {
      const batch = String(body.batch).trim();
      if (!batch)
        return NextResponse.json(
          { error: "Batch is required" },
          { status: 400 },
        );
      update.batch = batch;
    }

    if (body.religion !== undefined) {
      update.religion = body.religion ? String(body.religion).trim() : null;
    }

    if (body.tShirtSize !== undefined) {
      if (!VALID_TSHIRT_SIZES.includes(body.tShirtSize)) {
        return NextResponse.json(
          { error: "Invalid T-Shirt size" },
          { status: 400 },
        );
      }
      update.tShirtSize = body.tShirtSize;
    }

    if (body.paymentMethod !== undefined) {
      if (!VALID_PAYMENT_METHODS.includes(body.paymentMethod)) {
        return NextResponse.json(
          { error: "Invalid payment method" },
          { status: 400 },
        );
      }
      update.paymentMethod = body.paymentMethod;
    }

    if (body.transactionId !== undefined) {
      update.transactionId = body.transactionId
        ? String(body.transactionId).trim()
        : null;
    }

    if (body.registeredBy !== undefined) {
      update.registeredBy = body.registeredBy
        ? String(body.registeredBy).trim()
        : null;
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      update.status = body.status;
      if (body.status === "rejected" && body.rejectionReason) {
        update.rejectionReason = String(body.rejectionReason)
          .trim()
          .slice(0, 500);
      }
      if (body.status === "pending" || body.status === "approved") {
        update.rejectionReason = null;
      }
    }

    // Guest fields — recalculate totals
    if (
      body.guestsUnder5 !== undefined ||
      body.guests5AndAbove !== undefined ||
      body.guestNames !== undefined
    ) {
      const guestsUnder5 =
        body.guestsUnder5 !== undefined
          ? typeof body.guestsUnder5 === "number" &&
            Number.isInteger(body.guestsUnder5) &&
            body.guestsUnder5 >= 0
            ? body.guestsUnder5
            : null
          : existing.guestsUnder5 || 0;

      const guests5AndAbove =
        body.guests5AndAbove !== undefined
          ? typeof body.guests5AndAbove === "number" &&
            Number.isInteger(body.guests5AndAbove) &&
            body.guests5AndAbove >= 0
            ? body.guests5AndAbove
            : null
          : existing.guests5AndAbove || 0;

      if (guestsUnder5 === null)
        return NextResponse.json(
          { error: "Invalid guestsUnder5 count" },
          { status: 400 },
        );
      if (guests5AndAbove === null)
        return NextResponse.json(
          { error: "Invalid guests5AndAbove count" },
          { status: 400 },
        );

      const guestNames: string[] = Array.isArray(body.guestNames)
        ? body.guestNames
            .filter((n: unknown) => typeof n === "string")
            .map((n: string) => n.trim())
        : existing.guestNames || [];

      const totalGuests = guestsUnder5 + guests5AndAbove;
      const totalAttendees = 1 + totalGuests;
      const amount = PRICE_PER_MEMBER + guests5AndAbove * PRICE_PER_GUEST_5PLUS;

      update.guestsUnder5 = guestsUnder5;
      update.guests5AndAbove = guests5AndAbove;
      update.guestNames = guestNames;
      update.totalGuests = totalGuests;
      update.totalAttendees = totalAttendees;
      update.amount = amount;
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      registration: formatRegistration(result),
    });
  } catch (error) {
    console.error("Error updating registration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/registrations — delete a registration */
export async function DELETE(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, "registrations.edit");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Valid registration ID is required" },
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

    const db = getDb(client);
    const result = await db
      .collection("registrations")
      .findOneAndDelete({ _id: new ObjectId(id) });

    if (!result) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting registration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
