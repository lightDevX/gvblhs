"use server";

import clientPromise from "@/lib/db/mongodb";

export async function submitContactForm(formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  try {
    const client = await clientPromise;
    const databaseName = process.env.NEXT_DATABASE_NAME || "reunion2026";
    const db = client.db(databaseName);
    const collection = db.collection("contact_messages");

    const message = {
      ...formData,
      subject: formData.subject || null,
      createdAt: new Date(),
      status: "unread",
    };

    const result = await collection.insertOne(message);

    if (result.insertedId) {
      return { success: true, id: result.insertedId };
    } else {
      return { success: false, error: "Failed to save message" };
    }
  } catch (error) {
    console.error("Error saving contact message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Database error",
    };
  }
}
