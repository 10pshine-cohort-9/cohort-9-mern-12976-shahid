

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;


export async function connectTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  try {
    await mongoose.connect(uri);
  } catch (err) {
    await mongoServer.stop();
    throw err;
  }
}


export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  let firstError;
  for (const key in collections) {
    try {
      await collections[key].deleteMany({});
    } catch (err) {
      firstError ??= err;
    }
  }
  if (firstError) throw firstError;
}


export async function closeTestDB() {
  try {
    await mongoose.connection.dropDatabase();
  } finally {
    await mongoose.connection.close();
    await mongoServer.stop();
  }
}
