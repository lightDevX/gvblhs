import { MongoClient } from "mongodb";

const dbUri = `mongodb+srv://${process.env.NEXT_MONGO_USER}:${process.env.NEXT_MONGO_PASSWORD}@gvblhs-reunion.3ysxpx4.mongodb.net/?appName=gvblhs-reunion`;

const uri = dbUri as string;
const options = {
  retryWrites: true,
  w: "majority",
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (
  !dbUri ||
  !process.env.NEXT_MONGO_USER ||
  !process.env.NEXT_MONGO_PASSWORD
) {
  throw new Error(
    "Please add your MongoDB credentials (NEXT_MONGO_USER, NEXT_MONGO_PASSWORD) to .env.local",
  );
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch((err) => {
      console.error("MongoDB connection error:", err.message);
      throw err;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
