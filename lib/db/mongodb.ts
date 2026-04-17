import { MongoClient, type MongoClientOptions } from "mongodb";

const DEFAULT_MONGO_HOST = "gvblhsdb.iwnhyio.mongodb.net";

function extractHostFromMongoUri(uri: string): string | null {
  const atIndex = uri.lastIndexOf("@");
  if (atIndex === -1) {
    return null;
  }

  const hostAndPath = uri.slice(atIndex + 1);
  const host = hostAndPath.split(/[/?]/)[0]?.trim();
  return host || null;
}

function resolveMongoUri(): string {
  const configuredUri = process.env.MONGO_URL?.trim();
  const username = process.env.MONGO_USER?.trim();
  const password = process.env.MONGO_PASSWORD?.trim();

  if (username && password) {
    if (configuredUri?.startsWith("mongodb://")) {
      const hostAndPath = configuredUri.includes("@")
        ? configuredUri.slice(configuredUri.lastIndexOf("@") + 1)
        : configuredUri.replace(/^mongodb:\/\//, "");

      return `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${hostAndPath}`;
    }

    const hostFromUri = configuredUri
      ? extractHostFromMongoUri(configuredUri)
      : null;
    const host =
      process.env.MONGO_HOST?.trim() || hostFromUri || DEFAULT_MONGO_HOST;

    return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/?retryWrites=true&w=majority&appName=gvblhsDB`;
  }

  if (configuredUri) {
    return configuredUri;
  }

  throw new Error(
    "MongoDB credentials are missing. Set MONGO_URL or both MONGO_USER and MONGO_PASSWORD in .env.local.",
  );
}

const uri = resolveMongoUri();
const options: MongoClientOptions = {
  retryWrites: true,
  w: "majority",
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
};

function createClientPromise(): Promise<MongoClient | null> {
  const client = new MongoClient(uri, options);
  return client.connect().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("querySrv ECONNREFUSED")) {
      console.error(
        "MongoDB connection failed:",
        message,
        "\nHint: Your DNS resolver is rejecting SRV lookups. Use a standard mongodb:// URI in MONGO_URL (non-SRV), or change system DNS.",
      );
      return null;
    }

    console.error("MongoDB connection failed:", message);
    return null;
  });
}

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoClientPromise: Promise<MongoClient | null> | undefined;
}

async function getMongoClient(): Promise<MongoClient | null> {
  if (global._mongoClient) {
    return global._mongoClient;
  }

  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }

  const client = await global._mongoClientPromise;
  if (!client) {
    // Allow subsequent requests to retry connection instead of getting stuck.
    global._mongoClientPromise = undefined;
    return null;
  }

  global._mongoClient = client;
  return client;
}

const clientPromise: PromiseLike<MongoClient | null> = {
  then(onfulfilled, onrejected) {
    return getMongoClient().then(onfulfilled, onrejected);
  },
};

export default clientPromise;
