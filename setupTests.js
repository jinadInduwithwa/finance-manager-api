import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

MongoMemoryServer.create({
  instance: {
    launchTimeout: 60000, // 60 seconds
  },
});

beforeAll(async () => {
  // Increase the timeout for starting the in-memory MongoDB instance
  jest.setTimeout(30000); // Set timeout to 30 seconds

  // Start an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create({
    instance: {
      debug: true, // Enable debug logging for more information
    },
  });
  const uri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(uri);
}, 30000); // Set timeout for the beforeAll hook

afterAll(async () => {
  // Disconnect from the database and stop the in-memory MongoDB instance
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000); // Set timeout for the afterAll hook