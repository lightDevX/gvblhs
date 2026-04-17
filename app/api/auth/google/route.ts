import clientPromise from "@/lib/db/mongodb";
import { signJWT } from "@/lib/tokens/jwt";
import { type Db, type ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

interface GoogleAuthRequestBody {
  idToken?: unknown;
  email?: unknown;
  name?: unknown;
  phone?: unknown;
  age?: unknown;
  religion?: unknown;
  customReligion?: unknown;
  category?: unknown;
  batch?: unknown;
  transactionId?: unknown;
}

interface FirebaseLookupProvider {
  providerId?: string;
}

interface FirebaseLookupUser {
  email?: string;
  displayName?: string;
  emailVerified?: boolean;
  providerUserInfo?: FirebaseLookupProvider[];
}

interface FirebaseLookupError {
  message?: string;
}

interface FirebaseLookupResponse {
  users?: FirebaseLookupUser[];
  error?: FirebaseLookupError;
}

interface UserDocument {
  _id?: ObjectId;
  email: string;
  name: string;
  password?: string | null;
  role?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  phone?: string | null;
  age?: string | null;
  religion?: string | null;
  customReligion?: string | null;
  category?: "student" | "guest" | null;
  batch?: string | null;
  transactionId?: string | null;
  authProvider?: "email" | "google" | null;
}

type RegistrationCategory = "student" | "guest";

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function verifyFirebaseIdToken(
  idToken: string,
): Promise<FirebaseLookupUser> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Firebase API key is not configured");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );

  const data = (await response
    .json()
    .catch(() => null)) as FirebaseLookupResponse | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || "Invalid or expired token");
  }

  const user = data?.users?.[0];
  if (!user?.email) {
    throw new Error("Token did not include an email");
  }

  const providerInfo = user.providerUserInfo || [];
  if (
    providerInfo.length > 0 &&
    !providerInfo.some((provider) => provider.providerId === "google.com")
  ) {
    throw new Error("Token is not from a Google provider");
  }

  if (user.emailVerified === false) {
    throw new Error("Google account email is not verified");
  }

  return user;
}

async function upsertCategoryRecord(params: {
  db: Db;
  userId: ObjectId;
  category: RegistrationCategory;
  age: string | null;
  batch: string | null;
  religion: string | null;
  customReligion: string | null;
  phone: string | null;
  transactionId: string | null;
  now: Date;
}): Promise<void> {
  const {
    db,
    userId,
    category,
    age,
    batch,
    religion,
    customReligion,
    phone,
    transactionId,
    now,
  } = params;

  if (category === "student") {
    if (!batch) {
      throw new Error("Batch is required for student registration");
    }

    await db.collection("students").updateOne(
      { userId },
      {
        $set: {
          batch,
          religion,
          customReligion,
          phone,
          transactionId,
          updatedAt: now,
        },
        $setOnInsert: {
          userId,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return;
  }

  await db.collection("guests").updateOne(
    { userId },
    {
      $set: {
        age,
        religion,
        customReligion,
        phone,
        transactionId,
        updatedAt: now,
      },
      $setOnInsert: {
        userId,
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GoogleAuthRequestBody;

    const idToken = asTrimmedString(body.idToken);
    const requestedEmail = asTrimmedString(body.email)?.toLowerCase() ?? "";
    const requestedName = asTrimmedString(body.name);
    const phone = asTrimmedString(body.phone);
    const age = asTrimmedString(body.age);
    const religion = asTrimmedString(body.religion);
    const customReligion = asTrimmedString(body.customReligion);
    const batch = asTrimmedString(body.batch);
    const transactionId = asTrimmedString(body.transactionId);

    if (!idToken || !requestedEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const rawCategory = asTrimmedString(body.category);
    if (rawCategory && rawCategory !== "student" && rawCategory !== "guest") {
      return NextResponse.json(
        { error: "Category must be student or guest" },
        { status: 400 },
      );
    }

    const category = rawCategory as RegistrationCategory | null;

    if (category === "student" && !batch) {
      return NextResponse.json(
        { error: "Batch is required for student registration" },
        { status: 400 },
      );
    }

    if (category === "guest" && !age) {
      return NextResponse.json(
        { error: "Age group is required for guest registration" },
        { status: 400 },
      );
    }

    if (religion === "Custom" && !customReligion) {
      return NextResponse.json(
        { error: "Custom religion is required" },
        { status: 400 },
      );
    }

    const normalizedReligion =
      religion === "Custom" ? customReligion : religion;
    const normalizedCustomReligion =
      religion === "Custom" ? customReligion : null;

    let firebaseUser: FirebaseLookupUser;
    try {
      firebaseUser = await verifyFirebaseIdToken(idToken);
    } catch (tokenError) {
      const message =
        tokenError instanceof Error
          ? tokenError.message
          : "Invalid or expired token";

      console.error("Token verification failed:", message);
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const verifiedEmail = firebaseUser.email?.trim().toLowerCase();
    if (!verifiedEmail || verifiedEmail !== requestedEmail) {
      return NextResponse.json(
        { error: "Email mismatch in token" },
        { status: 401 },
      );
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable. Please try again later." },
        { status: 503 },
      );
    }

    const databaseName = process.env.MONGO_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);
    const usersCollection = db.collection<UserDocument>("users");

    let user = await usersCollection.findOne({ email: verifiedEmail });
    const now = new Date();

    if (!user) {
      const name =
        requestedName ||
        asTrimmedString(firebaseUser.displayName) ||
        verifiedEmail.split("@")[0];

      const userResult = await usersCollection.insertOne({
        email: verifiedEmail,
        name,
        password: null,
        phone,
        religion: normalizedReligion,
        customReligion: normalizedCustomReligion,
        category,
        batch: category === "student" ? batch : null,
        transactionId,
        authProvider: "google",
        role: "user",
        isActive: true,
        createdAt: now,
        age: category === "guest" ? age : null,
        updatedAt: now,
      });

      if (category) {
        await upsertCategoryRecord({
          db,
          userId: userResult.insertedId,
          category,
          age: category === "guest" ? age : null,
          batch,
          religion: normalizedReligion,
          customReligion: normalizedCustomReligion,
          phone,
          transactionId,
          now,
        });
      }

      user = await usersCollection.findOne({ _id: userResult.insertedId });
    } else {
      const existingCategory = user.category ?? null;
      const updateData: Partial<UserDocument> & { updatedAt: Date } = {
        updatedAt: now,
      };

      if (requestedName && !user.name) {
        updateData.name = requestedName;
      }

      if (phone && !user.phone) {
        updateData.phone = phone;
      }

      if (normalizedReligion && !user.religion) {
        updateData.religion = normalizedReligion;
      }

      if (normalizedCustomReligion && !user.customReligion) {
        updateData.customReligion = normalizedCustomReligion;
      }

      if (category && !existingCategory) {
        updateData.category = category;
        if (category === "student") {
          updateData.batch = batch;
        }
      }

      if (transactionId && !user.transactionId) {
        updateData.transactionId = transactionId;
      }

      if (user.authProvider !== "google") {
        updateData.authProvider = "google";
      }

      if (Object.keys(updateData).length > 1) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: updateData },
        );
        user = await usersCollection.findOne({ _id: user._id });
      }

      if (category && !existingCategory && user) {
        await upsertCategoryRecord({
          db,
          age: category === "guest" ? age : null,
          userId: user._id,
          category,
          batch,
          religion: normalizedReligion,
          customReligion: normalizedCustomReligion,
          phone,
          transactionId,
          now,
        });
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Failed to process user" },
        { status: 500 },
      );
    }

    const token = await signJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || "user",
    });

    const createdAt =
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : now.toISOString();

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role || "user",
          createdAt,
        },
      },
      { status: 200 },
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Google sign-in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
