import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/wad-final-2026";

const options = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of pending indefinitely
  socketTimeoutMS: 10000,
  connectTimeoutMS: 5000,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export function getClientPromise() {
  return clientPromise;
}

export async function getDb() {
  const connectedClient = await clientPromise;
  return connectedClient.db(process.env.DB_NAME || "wad-final-2026");
}

export async function connectToDatabase() {
  const db = await getDb();
  return { db };
}
export default clientPromise;