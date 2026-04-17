import clientPromise from "@/lib/db/mongodb";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/migrate-roles
 * One-time migration: upgrades existing "admin" users to the new role system.
 * - First admin → main_admin with fullAccess
 * - Other admins → keep role, add fullAccess + new fields
 * Only works in development or when no main_admin exists yet.
 */
export async function POST() {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    const db = client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");
    const users = db.collection("users");

    // First, update the collection validator to accept new roles
    await db.command({
      collMod: "users",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["email", "role", "createdAt"],
          properties: {
            _id: { bsonType: "objectId" },
            name: { bsonType: "string" },
            email: { bsonType: "string" },
            password: { bsonType: ["string", "null"] },
            mobile: { bsonType: ["string", "null"] },
            role: { enum: ["main_admin", "admin", "sub_admin"] },
            permissions: { bsonType: "array" },
            fullAccess: { bsonType: "bool" },
            mustChangePassword: { bsonType: "bool" },
            isActive: { bsonType: "bool" },
            createdBy: { bsonType: ["objectId", "null"] },
            updatedBy: { bsonType: ["objectId", "null"] },
            lastLoginAt: { bsonType: ["date", "null"] },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" },
          },
        },
      },
      validationLevel: "moderate",
    });

    // Check if main_admin already exists
    const existingMainAdmin = await users.findOne({ role: "main_admin" });
    if (existingMainAdmin) {
      return NextResponse.json({
        message: "Migration already done — main_admin exists",
        mainAdmin: existingMainAdmin.email,
      });
    }

    // Find all users with old "admin" role
    const admins = await users.find({ role: "admin" }).toArray();
    if (admins.length === 0) {
      return NextResponse.json(
        { error: "No admin users found to migrate" },
        { status: 404 },
      );
    }

    const results: string[] = [];

    // Upgrade the first admin to main_admin
    const first = admins[0];
    await users.updateOne(
      { _id: first._id },
      {
        $set: {
          role: "main_admin",
          fullAccess: true,
          permissions: [],
          mustChangePassword: false,
          isActive: true,
          updatedAt: new Date(),
        },
      },
    );
    results.push(`${first.email} → main_admin (fullAccess)`);

    // Upgrade remaining admins — keep "admin" role, add new fields
    for (let i = 1; i < admins.length; i++) {
      const a = admins[i];
      await users.updateOne(
        { _id: a._id },
        {
          $set: {
            fullAccess: true,
            permissions: [],
            mustChangePassword: false,
            isActive: true,
            updatedAt: new Date(),
          },
        },
      );
      results.push(`${a.email} → admin (fullAccess)`);
    }

    return NextResponse.json({
      success: true,
      message: `Migrated ${results.length} user(s)`,
      results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
