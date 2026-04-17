import { getAuthAdmin } from "@/lib/auth/require-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAuthAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
      fullAccess: admin.fullAccess,
      mustChangePassword: admin.mustChangePassword,
      isActive: admin.isActive,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
