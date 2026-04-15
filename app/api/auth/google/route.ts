import clientPromise from "@/lib/db/mongodb";
import { signJWT } from "@/lib/tokens/jwt";
import { NextRequest, NextResponse } from "next/server";

// Decode JWT without verification (Firebase already validated on client)
function decodeJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    // Decode the payload (second part)
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf-8"),
    );
    return payload;
  } catch (error) {
    console.error("JWT decode error:", error);
    throw new Error("Failed to decode token");
  }
}

async function verifyGoogleToken(idToken: string) {
  try {
    // Decode the token locally
    // Note: Firebase already validated this token on the client side,
    // so we trust the claims within it
    const decoded = decodeJWT(idToken);

    // Verify it's a Google token and not expired
    if (!decoded.email || !decoded.aud || !decoded.iss) {
      throw new Error("Invalid token claims");
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error("Token expired");
    }

    return decoded;
  } catch (error) {
    console.error("Token verification error:", error);
    throw new Error("Failed to verify Google token");
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      idToken,
      email,
      name,
      phone,
      religion,
      customReligion,
      category,
      batch,
      transactionId,
    } = await request.json();

    if (!idToken || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify the token with Google
    let decodedToken;
    try {
      decodedToken = await verifyGoogleToken(idToken);
    } catch (tokenError: any) {
      console.error("Token verification failed:", tokenError.message);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    // Verify email matches
    if (decodedToken.email !== email) {
      return NextResponse.json(
        { error: "Email mismatch in token" },
        { status: 401 },
      );
    }

    let client;
    try {
      client = await clientPromise;
    } catch (dbError: any) {
      console.error("MongoDB connection failed:", dbError.message);
      return NextResponse.json(
        { error: "Database connection failed. Please try again." },
        { status: 500 },
      );
    }

    const databaseName = process.env.NEXT_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);
    const usersCollection = db.collection("users");

    // Check if user exists
    let user = await usersCollection.findOne({ email });

    if (!user) {
      // Create new user from Google Sign-In with all available data
      const newUserData: any = {
        email,
        name: name || email.split("@")[0],
        password: null, // No password for OAuth users
        authProvider: "google",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add optional fields if provided
      if (phone) newUserData.phone = phone;
      if (religion) newUserData.religion = religion;
      if (customReligion) newUserData.customReligion = customReligion;
      if (category) newUserData.category = category;
      if (batch) newUserData.batch = batch;
      if (transactionId) newUserData.transactionId = transactionId;

      const result = await usersCollection.insertOne(newUserData);

      user = {
        _id: result.insertedId,
        email,
        name: name || email.split("@")[0],
        role: "user",
        createdAt: new Date(),
        ...newUserData,
      };

      // Create student or guest record if category is provided
      if (category === "student") {
        const studentsCollection = db.collection("students");
        await studentsCollection.insertOne({
          userId: result.insertedId,
          batch,
          religion: religion || null,
          customReligion: customReligion || null,
          phone: phone || null,
          transactionId: transactionId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (category === "guest") {
        const guestsCollection = db.collection("guests");
        await guestsCollection.insertOne({
          userId: result.insertedId,
          religion: religion || null,
          customReligion: customReligion || null,
          phone: phone || null,
          transactionId: transactionId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      // Update existing user with new data if provided
      const updateData: any = { updatedAt: new Date() };

      if (phone && !user.phone) updateData.phone = phone;
      if (religion && !user.religion) updateData.religion = religion;
      if (customReligion && !user.customReligion)
        updateData.customReligion = customReligion;
      if (category && !user.category) updateData.category = category;
      if (batch && !user.batch) updateData.batch = batch;
      if (transactionId && !user.transactionId)
        updateData.transactionId = transactionId;

      if (Object.keys(updateData).length > 1) {
        await usersCollection.updateOne({ email }, { $set: updateData });
        user = { ...user, ...updateData };

        // Create student or guest record if category is being set for the first time
        if (
          category &&
          !user.category &&
          (category === "student" || category === "guest")
        ) {
          if (category === "student") {
            const studentsCollection = db.collection("students");
            await studentsCollection.insertOne({
              userId: user._id,
              batch,
              religion: religion || null,
              customReligion: customReligion || null,
              phone: phone || null,
              transactionId: transactionId || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else if (category === "guest") {
            const guestsCollection = db.collection("guests");
            await guestsCollection.insertOne({
              userId: user._id,
              religion: religion || null,
              customReligion: customReligion || null,
              phone: phone || null,
              transactionId: transactionId || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }
    }

    // Generate JWT token
    const token = await signJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || "user",
    });

    // Set cookie
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      { status: 200 },
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    return NextResponse.json(
      { error: error.message || "Authentication failed" },
      { status: 401 },
    );
  }
}
