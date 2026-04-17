import { hashPassword } from "@/lib/auth/password";
import { getAuthAdmin } from "@/lib/auth/require-admin";
import clientPromise from "@/lib/db/mongodb";
import { ALL_PERMISSIONS, hasPermission, VALID_ROLES } from "@/lib/permissions";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

function forbidden(msg = "Forbidden") {
  return NextResponse.json({ error: msg }, { status: 403 });
}

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

/**
 * GET /api/admin/users
 * List all admin users. Requires admins.view permission.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getAuthAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (admin.mustChangePassword) return forbidden("Password change required");
    if (!hasPermission(admin.role, admin.fullAccess, admin.permissions, "admins.view")) {
      return forbidden("Missing permission: admins.view");
    }

    const client = await clientPromise;
    if (!client) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    const db = client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");

    const users = await db
      .collection("users")
      .find({})
      .project({
        _id: 1, name: 1, email: 1, mobile: 1, role: 1, permissions: 1,
        fullAccess: 1, mustChangePassword: 1, isActive: 1, createdAt: 1, updatedAt: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = users.map((u) => ({
      id: u._id.toString(),
      name: u.name || "",
      email: u.email || "",
      mobile: u.mobile || "",
      role: u.role || "sub_admin",
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
      fullAccess: u.fullAccess === true,
      mustChangePassword: u.mustChangePassword === true,
      isActive: u.isActive !== false,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : "",
      updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : "",
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Get admin users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Create a new admin/sub_admin. Only main_admin can create.
 * Body: { name, email, mobile?, role, password, permissions?, fullAccess? }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (admin.mustChangePassword) return forbidden("Password change required");
    if (admin.role !== "main_admin") return forbidden("Only Main Admin can create admin accounts");

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const mobile = typeof body.mobile === "string" ? body.mobile.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullAccess = body.fullAccess === true;
    const permissions: string[] = Array.isArray(body.permissions)
      ? body.permissions.filter((p: unknown) => typeof p === "string" && ALL_PERMISSIONS.includes(p as any))
      : [];

    if (!name) return bad("Name is required");
    if (!email) return bad("Email is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Invalid email format");
    if (!password) return bad("Initial password is required");
    if (password.length < 6) return bad("Password must be at least 6 characters");
    if (role !== "admin" && role !== "sub_admin") return bad("Role must be admin or sub_admin");

    const client = await clientPromise;
    if (!client) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    const db = client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");

    const existing = await db.collection("users").findOne({ email });
    if (existing) return bad("Email already in use");

    const hashed = await hashPassword(password);
    const now = new Date();

    const doc = {
      name,
      email,
      mobile: mobile || null,
      password: hashed,
      role,
      permissions: fullAccess ? [...ALL_PERMISSIONS] : permissions,
      fullAccess,
      mustChangePassword: true,
      isActive: true,
      createdBy: new ObjectId(admin.id),
      updatedBy: new ObjectId(admin.id),
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("users").insertOne(doc);

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      message: `${role === "admin" ? "Admin" : "Sub Admin"} created successfully`,
    }, { status: 201 });
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 * Update an admin user. Only main_admin can modify.
 * Body: { id, action, ...data }
 * Actions: update_role, update_permissions, reset_password, toggle_active
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAuthAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (admin.mustChangePassword) return forbidden("Password change required");

    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const action = typeof body.action === "string" ? body.action : "";

    if (!id || !ObjectId.isValid(id)) return bad("Valid admin ID is required");
    if (!action) return bad("Action is required");

    const client = await clientPromise;
    if (!client) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    const db = client.db(process.env.MONGO_DATABASE_NAME || "reunion2026");
    const target = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!target) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

    // Prevent modifying main_admin accounts (only main_admin can self-manage via other means)
    if (target.role === "main_admin" && admin.id !== id) {
      return forbidden("Cannot modify another Main Admin account");
    }

    switch (action) {
      case "update_role": {
        if (admin.role !== "main_admin") return forbidden("Only Main Admin can change roles");
        if (target.role === "main_admin") return forbidden("Cannot change Main Admin role");
        const newRole = typeof body.role === "string" ? body.role : "";
        if (newRole !== "admin" && newRole !== "sub_admin") return bad("Role must be admin or sub_admin");

        await db.collection("users").updateOne(
          { _id: new ObjectId(id) },
          { $set: { role: newRole, updatedBy: new ObjectId(admin.id), updatedAt: new Date() } },
        );
        return NextResponse.json({ success: true, message: "Role updated" });
      }

      case "update_permissions": {
        if (admin.role !== "main_admin") return forbidden("Only Main Admin can change permissions");
        if (target.role === "main_admin") return forbidden("Cannot change Main Admin permissions");
        const fullAccess = body.fullAccess === true;
        const permissions: string[] = Array.isArray(body.permissions)
          ? body.permissions.filter((p: unknown) => typeof p === "string" && ALL_PERMISSIONS.includes(p as any))
          : [];

        await db.collection("users").updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              fullAccess,
              permissions: fullAccess ? [...ALL_PERMISSIONS] : permissions,
              updatedBy: new ObjectId(admin.id),
              updatedAt: new Date(),
            },
          },
        );
        return NextResponse.json({ success: true, message: "Permissions updated" });
      }

      case "reset_password": {
        if (!hasPermission(admin.role, admin.fullAccess, admin.permissions, "admins.reset_password") && admin.role !== "main_admin") {
          return forbidden("Missing permission: admins.reset_password");
        }
        if (target.role === "main_admin" && admin.id !== id) {
          return forbidden("Cannot reset another Main Admin password");
        }
        const newPassword = typeof body.password === "string" ? body.password : "";
        if (!newPassword || newPassword.length < 6) return bad("New password must be at least 6 characters");

        const hashed = await hashPassword(newPassword);
        await db.collection("users").updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              password: hashed,
              mustChangePassword: true,
              updatedBy: new ObjectId(admin.id),
              updatedAt: new Date(),
            },
          },
        );
        return NextResponse.json({ success: true, message: "Password reset. User must set a new password on next login." });
      }

      case "toggle_active": {
        if (admin.role !== "main_admin") return forbidden("Only Main Admin can activate/deactivate accounts");
        if (target.role === "main_admin") return forbidden("Cannot deactivate Main Admin");
        if (id === admin.id) return forbidden("Cannot deactivate your own account");

        const newStatus = target.isActive === false;
        await db.collection("users").updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              isActive: newStatus,
              updatedBy: new ObjectId(admin.id),
              updatedAt: new Date(),
            },
          },
        );
        return NextResponse.json({ success: true, message: newStatus ? "Account activated" : "Account deactivated" });
      }

      default:
        return bad("Unknown action");
    }
  } catch (error) {
    console.error("Update admin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
