import { initializeDatabase } from "@/lib/db/init";
import { NextResponse } from "next/server";

/**
 * Initialize database collections
 * GET /api/admin/init-db
 * This endpoint creates the users and admin collections with proper schema validation and indexes
 */
export async function GET() {
  try {
    // In production, you might want to add authentication here
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Not available in production" },
        { status: 403 },
      );
    }

    const success = await initializeDatabase();

    if (success) {
      return NextResponse.json(
        {
          success: true,
          message: "Database initialized successfully",
          collections: ["users", "admin"],
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { error: "Failed to initialize database" },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Init error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
