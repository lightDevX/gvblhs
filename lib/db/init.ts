import clientPromise from "./mongodb";

let isInitialized = false;

export async function initializeDatabase() {
  try {
    // Prevent multiple initialization attempts
    if (isInitialized) {
      return true;
    }

    const client = await clientPromise;

    if (!client) {
      throw new Error("MongoDB connection unavailable");
    }

    const databaseName = process.env.MONGO_DATABASE_NAME || "reunion2026";
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
              tshirtSize: {
                enum: ["XS", "S", "M", "L", "XL", "XXL", "XXXL", null],
              },
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

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Users collection created");
      }
    }

    // Create indexes for users collection
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ createdAt: -1 });
    await usersCollection.createIndex({ role: 1 });
    if (process.env.NODE_ENV === "development") {
      console.log("✅ Users indexes created");
    }

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

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Admin collection created");
      }
    }

    // Create indexes for admin collection
    const adminCollection = db.collection("admin");
    await adminCollection.createIndex({ userId: 1 }, { unique: true });
    await adminCollection.createIndex({ role: 1 });
    await adminCollection.createIndex({ createdAt: -1 });
    if (process.env.NODE_ENV === "development") {
      console.log("✅ Admin indexes created");
    }

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

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Students collection created");
      }
    }

    // Create indexes for students collection
    const studentsCollection = db.collection("students");
    await studentsCollection.createIndex({ userId: 1 }, { unique: true });
    await studentsCollection.createIndex({ batch: 1 });
    await studentsCollection.createIndex({ createdAt: -1 });
    if (process.env.NODE_ENV === "development") {
      console.log("✅ Students indexes created");
    }

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

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Guests collection created");
      }
    }

    // Create indexes for guests collection
    const guestsCollection = db.collection("guests");
    await guestsCollection.createIndex({ userId: 1 }, { unique: true });
    await guestsCollection.createIndex({ createdAt: -1 });
    if (process.env.NODE_ENV === "development") {
      console.log("✅ Guests indexes created");
    }

    // Create tickets collection if it doesn't exist
    const ticketsCollectionExists = await db
      .listCollections({ name: "tickets" })
      .toArray()
      .then((collections) => collections.length > 0);

    if (!ticketsCollectionExists) {
      await db.createCollection("tickets", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["userId", "paymentStatus", "createdAt"],
            properties: {
              _id: { bsonType: "objectId" },
              userId: { bsonType: "objectId" },
              ticketId: { bsonType: ["string", "null"] },
              paymentMethod: { enum: ["mfs", "bank", "manual", null] },
              paymentStatus: { enum: ["pending", "paid", "rejected"] },
              transactionId: { bsonType: ["string", "null"] },
              amount: { bsonType: ["double", "int"] },
              approvedAt: { bsonType: ["date", "null"] },
              approvedBy: { bsonType: ["objectId", "null"] },
              ticketGenerated: { bsonType: "bool" },
              ticketGeneratedAt: { bsonType: ["date", "null"] },
              ticketGeneratedBy: { bsonType: ["objectId", "null"] },
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
            },
          },
        },
      });

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Tickets collection created");
      }
    }

    // Create indexes for tickets collection
    const ticketsCollection = db.collection("tickets");
    await ticketsCollection.createIndex({ userId: 1 });
    await ticketsCollection.createIndex({ paymentStatus: 1 });
    await ticketsCollection.createIndex({ createdAt: -1 });
    if (process.env.NODE_ENV === "development") {
      console.log("✅ Tickets indexes created");
    }

    // Create contact_messages collection if it doesn't exist
    const messagesCollectionExists = await db
      .listCollections({ name: "contact_messages" })
      .toArray()
      .then((collections) => collections.length > 0);

    if (!messagesCollectionExists) {
      await db.createCollection("contact_messages", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["name", "email", "message", "createdAt"],
            properties: {
              _id: { bsonType: "objectId" },
              name: { bsonType: "string" },
              email: {
                bsonType: "string",
                pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
              },
              phone: { bsonType: ["string", "null"] },
              subject: { bsonType: ["string", "null"] },
              message: { bsonType: "string" },
              status: {
                enum: ["unread", "read", "replied"],
                default: "unread",
              },
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
            },
          },
        },
      });

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Contact Messages collection created");
      }
    }

    // Create indexes for contact_messages collection
    const messagesCollection = db.collection("contact_messages");
    await messagesCollection.createIndex({ email: 1 });
    await messagesCollection.createIndex({ createdAt: -1 });
    await messagesCollection.createIndex({ status: 1 });
    if (process.env.NODE_ENV === "development") {
      console.log("✅ Contact Messages indexes created");
    }

    // Migration: Add tshirtSize field to existing users if missing
    const usersForMigration = db.collection("users");
    const usersWithoutTshirtSize = await usersForMigration.countDocuments({
      tshirtSize: { $exists: false },
    });
    if (usersWithoutTshirtSize > 0) {
      await usersForMigration.updateMany(
        { tshirtSize: { $exists: false } },
        { $set: { tshirtSize: null, updatedAt: new Date() } },
      );
      if (process.env.NODE_ENV === "development") {
        console.log(
          `✅ Added tshirtSize field to ${usersWithoutTshirtSize} existing users`,
        );
      }
    }

    // Migration: Add ticket generation fields to existing tickets if missing
    const ticketsForMigration = db.collection("tickets");
    const ticketsWithoutGenFields = await ticketsForMigration.countDocuments({
      $or: [
        { ticketGenerated: { $exists: false } },
        { ticketGeneratedAt: { $exists: false } },
        { ticketGeneratedBy: { $exists: false } },
      ],
    });
    if (ticketsWithoutGenFields > 0) {
      await ticketsForMigration.updateMany(
        {
          $or: [
            { ticketGenerated: { $exists: false } },
            { ticketGeneratedAt: { $exists: false } },
            { ticketGeneratedBy: { $exists: false } },
          ],
        },
        {
          $set: {
            ticketGenerated: false,
            ticketGeneratedAt: null,
            ticketGeneratedBy: null,
            updatedAt: new Date(),
          },
        },
      );
      if (process.env.NODE_ENV === "development") {
        console.log(
          `✅ Added ticket generation fields to ${ticketsWithoutGenFields} existing tickets`,
        );
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Database initialization complete!");
    }
    isInitialized = true;
    return true;
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    return false;
  }
}
