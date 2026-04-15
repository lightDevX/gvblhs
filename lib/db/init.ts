import clientPromise from "./mongodb";

export async function initializeDatabase() {
  try {
    const client = await clientPromise;
    const databaseName = process.env.NEXT_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);

    // Create users collection if it doesn't exist
    const usersCollectionExists = await db
      .listCollections({ name: "users" })
      .toArray()
      .then((collections) => collections.length > 0);

    if (!usersCollectionExists) {
      await db.createCollection("users", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["email", "role", "createdAt"],
            properties: {
              _id: { bsonType: "objectId" },
              name: { bsonType: "string" },
              email: {
                bsonType: "string",
                pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
              },
              password: { bsonType: ["string", "null"] },
              phone: { bsonType: ["string", "null"] },
              religion: { bsonType: ["string", "null"] },
              customReligion: { bsonType: ["string", "null"] },
              category: { enum: ["student", "guest", null] },
              batch: { bsonType: ["string", "null"] },
              transactionId: { bsonType: ["string", "null"] },
              authProvider: { enum: ["email", "google", null] },
              role: { enum: ["user", "admin", "moderator"] },
              isActive: { bsonType: "bool" },
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
            },
          },
        },
      });

      console.log("✅ Users collection created");
    }

    // Create indexes for users collection
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ createdAt: -1 });
    await usersCollection.createIndex({ role: 1 });
    console.log("✅ Users indexes created");

    // Create admin collection if it doesn't exist
    const adminCollectionExists = await db
      .listCollections({ name: "admin" })
      .toArray()
      .then((collections) => collections.length > 0);

    if (!adminCollectionExists) {
      await db.createCollection("admin", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["userId", "role", "createdAt"],
            properties: {
              _id: { bsonType: "objectId" },
              userId: { bsonType: "objectId" },
              role: { enum: ["admin", "moderator", "viewer"] },
              permissions: {
                bsonType: "array",
                items: {
                  bsonType: "string",
                  enum: [
                    "manage_users",
                    "manage_events",
                    "view_reports",
                    "manage_roles",
                  ],
                },
              },
              lastLogin: { bsonType: ["date", "null"] },
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
            },
          },
        },
      });

      console.log("✅ Admin collection created");
    }

    // Create indexes for admin collection
    const adminCollection = db.collection("admin");
    await adminCollection.createIndex({ userId: 1 }, { unique: true });
    await adminCollection.createIndex({ role: 1 });
    await adminCollection.createIndex({ createdAt: -1 });
    console.log("✅ Admin indexes created");

    // Create students collection if it doesn't exist
    const studentsCollectionExists = await db
      .listCollections({ name: "students" })
      .toArray()
      .then((collections) => collections.length > 0);

    if (!studentsCollectionExists) {
      await db.createCollection("students", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["userId", "batch", "createdAt"],
            properties: {
              _id: { bsonType: "objectId" },
              userId: { bsonType: "objectId" },
              batch: { bsonType: "string" },
              religion: { bsonType: ["string", "null"] },
              customReligion: { bsonType: ["string", "null"] },
              phone: { bsonType: ["string", "null"] },
              transactionId: { bsonType: ["string", "null"] },
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
            },
          },
        },
      });

      console.log("✅ Students collection created");
    }

    // Create indexes for students collection
    const studentsCollection = db.collection("students");
    await studentsCollection.createIndex({ userId: 1 }, { unique: true });
    await studentsCollection.createIndex({ batch: 1 });
    await studentsCollection.createIndex({ createdAt: -1 });
    console.log("✅ Students indexes created");

    // Create guests collection if it doesn't exist
    const guestsCollectionExists = await db
      .listCollections({ name: "guests" })
      .toArray()
      .then((collections) => collections.length > 0);

    if (!guestsCollectionExists) {
      await db.createCollection("guests", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["userId", "createdAt"],
            properties: {
              _id: { bsonType: "objectId" },
              userId: { bsonType: "objectId" },
              religion: { bsonType: ["string", "null"] },
              customReligion: { bsonType: ["string", "null"] },
              phone: { bsonType: ["string", "null"] },
              transactionId: { bsonType: ["string", "null"] },
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
            },
          },
        },
      });

      console.log("✅ Guests collection created");
    }

    // Create indexes for guests collection
    const guestsCollection = db.collection("guests");
    await guestsCollection.createIndex({ userId: 1 }, { unique: true });
    await guestsCollection.createIndex({ createdAt: -1 });
    console.log("✅ Guests indexes created");

    console.log("✅ Database initialization complete!");
    return true;
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    return false;
  }
}
