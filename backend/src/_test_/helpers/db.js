/**
 * Test database helpers using mongodb-memory-server.
 *
 * Usage in every test file:
 *   before(connectTestDB)
 *   afterEach(clearTestDB)
 *   after(closeTestDB)
 */

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

/**
 * Spin up an in-memory MongoDB instance and connect Mongoose to it.
 * Called once before the test suite starts.
 */
export async function connectTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

/**
 * Drop every collection after each test so tests are fully isolated.
 * Faster than dropping the whole database while still giving a clean slate.
 */
export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Disconnect Mongoose and stop the in-memory server after the suite ends.
 */
export async function closeTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
}
