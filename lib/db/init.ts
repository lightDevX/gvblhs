import clientPromise from "./mongodb";

let isInitialized = false;

export async function initializeDatabase() {
  try {
    if (isInitialized) return true;

    const client = await clientPromise;
    if (!client) throw new Error("MongoDB connection unavailable");

    const databaseName = process.env.MONGO_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);

    // --- Users collection (admin accounts only) ---
    const usersExists = await db.listCollections({ name: "users" }).toArray().then((c) => c.length > 0);
    if (!usersExists) {
      await db.createCollection("users", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["email", "role", "createdAt"],
            properties: {
              _id: { bsonType: "objectId" },
              name: { bsonType: "string" },
              email: { bsonType: "string", pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
              password: { bsonType: ["string", "null"] },
              role: { enum: ["admin", "moderator"] },
              isActive: { bsonType: "bool" },
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
            },
          },
        },
      });
      if (process.env.NODE_ENV === "development") console.log("Users collection created");
    }
    const usersCol = db.collection("users");
    await usersCol.createIndex({ email: 1 }, { unique: true });
    await usersCol.createIndex({ role: 1 });

    // --- Registrations collection (public registrations) ---
    const regsExists = await db.listCollections({ name: "registrations" }).toArray().then((c) => c.length > 0);
    if (!regsExists) {
      await db.createCollection("registrations", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["name", "mobile", "batch", "tShirtSize", "paymentMethod", "status", "createdAt"],
            properties: {
              _id: { bsonType: "objectId" },
              name: { bsonType: "string" },
              mobile: { bsonType: "string" },
              email: { bsonType: ["string", "null"] },
              batch: { bsonType: "string" },
              religion: { bsonType: ["string", "null"] },
              guestsUnder5: { bsonType: "int" },
              guests5AndAbove: { bsonType: "int" },
              guestNames: { bsonType: "array" },
              totalGuests: { bsonType: "int" },
              totalAttendees: { bsonType: "int" },
              tShirtSize: { enum: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
              paymentMethod: { enum: ["bkash", "nagad", "rocket", "bank", "manual"] },
              transactionId: { bsonType: ["string", "null"] },
              amount: { bsonType: ["int", "double"] },
              status: { enum: ["pending", "approved", "rejected"] },
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
            },
          },
        },
      });
      if (process.env.NODE_ENV === "development") console.log("Registrations collection created");
    }
    const regsCol = db.collection("registrations");
    await regsCol.createIndex({ mobile: 1 }, { unique: true });
    await regsCol.createIndex({ batch: 1 });
    await regsCol.createIndex({ status: 1 });
    await regsCol.createIndex({ createdAt: -1 });

    // --- Contact messages collection ---
    const msgsExists = await db.listCollections({ name: "contact_messages" }).toArray().then((c) => c.length > 0);
    if (!msgsExists) {
      await db.createCollection("contact_messages", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["name", "email", "message", "createdAt"],
            properties: {
              _id: { bsonType: "objectId" },
              name: { bsonType: "string" },
              email: { bsonType: "string", pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
              phone: { bsonType: ["string", "null"] },
              subject: { bsonType: ["string", "null"] },
              message: { bsonType: "string" },
              status: { enum: ["unread", "read", "replied"] },
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
            },
          },
        },
      });
      if (process.env.NODE_ENV === "development") console.log("Contact messages collection created");
    }
    const msgsCol = db.collection("contact_messages");
    await msgsCol.createIndex({ email: 1 });
    await msgsCol.createIndex({ createdAt: -1 });
    await msgsCol.createIndex({ status: 1 });

    if (process.env.NODE_ENV === "development") console.log("Database initialization complete!");
    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Database initialization error:", error);
    return false;
  }
}
