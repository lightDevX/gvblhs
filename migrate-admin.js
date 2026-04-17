/**
 * Migration script: Upgrade existing admin user(s) to the new role system.
 * - Sets role to "main_admin" for the first/existing admin
 * - Adds fullAccess: true, permissions, mustChangePassword, isActive fields
 *
 * Usage: node migrate-admin.js
 */

const { MongoClient } = require("mongodb");

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gvblhsDB:gvblhsDB%400810%40gb@gvblhsdb.iwnhyio.mongodb.net/?retryWrites=true&w=majority&appName=gvblhsDB";
const DB_NAME = process.env.MONGO_DATABASE_NAME || "gvblhsDB";

async function migrate() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);
    const users = db.collection("users");

    // Find all users with old "admin" role (or missing new fields)
    const admins = await users.find({ role: "admin" }).toArray();
    console.log(`Found ${admins.length} user(s) with role "admin"`);

    if (admins.length === 0) {
      console.log("No users to migrate. Checking for main_admin...");
      const mainAdmin = await users.findOne({ role: "main_admin" });
      if (mainAdmin) {
        console.log(`main_admin already exists: ${mainAdmin.email}`);
      } else {
        console.log("No admin users found at all.");
      }
      return;
    }

    // Upgrade the first admin to main_admin with fullAccess
    const firstAdmin = admins[0];
    const result = await users.updateOne(
      { _id: firstAdmin._id },
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

    console.log(
      `Upgraded "${firstAdmin.email}" to main_admin (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`,
    );

    // If there are additional admins, give them fullAccess but keep as "admin"
    if (admins.length > 1) {
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
        console.log(`Updated "${a.email}" — kept as admin with fullAccess`);
      }
    }

    // Also patch any sub_admin users missing new fields
    const subAdmins = await users
      .find({ role: "sub_admin", fullAccess: { $exists: false } })
      .toArray();
    for (const sa of subAdmins) {
      await users.updateOne(
        { _id: sa._id },
        {
          $set: {
            fullAccess: false,
            permissions: [],
            mustChangePassword: true,
            isActive: true,
            updatedAt: new Date(),
          },
        },
      );
      console.log(`Patched sub_admin "${sa.email}" with new fields`);
    }

    console.log("\nMigration complete!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.close();
  }
}

migrate();
