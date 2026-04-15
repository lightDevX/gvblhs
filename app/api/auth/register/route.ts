import { hashPassword } from "@/lib/auth/password";
import clientPromise from "@/lib/db/mongodb";
import { signJWT } from "@/lib/tokens/jwt";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      email,
      password,
      phone,
      religion,
      customReligion,
      category = "guest",
      batch,
      transactionId,
    } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const databaseName = process.env.NEXT_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);
    const usersCollection = db.collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const userResult = await usersCollection.insertOne({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      religion: religion !== "Custom" ? religion : customReligion,
      customReligion: religion === "Custom" ? customReligion : null,
      category,
      batch: category === "student" ? batch : null,
      transactionId: transactionId || null,
      authProvider: "email",
      role: "user",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userId = userResult.insertedId;

    // Create student or guest record
    if (category === "student") {
      const studentsCollection = db.collection("students");
      await studentsCollection.insertOne({
        userId,
        batch,
        religion: religion !== "Custom" ? religion : customReligion,
        customReligion: religion === "Custom" ? customReligion : null,
        phone: phone || null,
        transactionId: transactionId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Register as guest
      const guestsCollection = db.collection("guests");
      await guestsCollection.insertOne({
        userId,
        religion: religion !== "Custom" ? religion : customReligion,
        customReligion: religion === "Custom" ? customReligion : null,
        phone: phone || null,
        transactionId: transactionId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Generate JWT token
    const token = await signJWT({
      userId: userId.toString(),
      email,
      role: "user",
    });

    // Set cookie
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: userId.toString(),
          name,
          email,
          role: "user",
          category,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
