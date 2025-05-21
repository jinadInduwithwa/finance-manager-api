import request from "supertest";
import app from "../../server.js"; 
import User from "../models/userModel.js";
import { StatusCodes } from "http-status-codes";

describe("User Controller Integration Tests", () => {

  const testUser = {
    name: "John Doe",
    email: "john@example.com",
    phoneNumber: "1234567890",
    password: "password123",
  };

  // Add a test user to the database before each test
  beforeEach(async () => {
    await User.create(testUser);
  });

  // Test GET /api/users
  it("should retrieve all users", async () => {
    const response = await request(app)
      .get("/api/users")
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.msg).toBe("Users retrieved successfully");
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].email).toBe(testUser.email);
  });

  // Test GET /api/users with filters
  it("should filter users by role", async () => {
    const response = await request(app)
      .get("/api/users")
      .query({ role: "user", page: 1, limit: 10 });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].role).toBe("user");
  });

  // Test GET /api/users with invalid filters
  it("should return 404 if no users match the filters", async () => {
    const response = await request(app)
      .get("/api/users")
      .query({ role: "admin", page: 1, limit: 10 });

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.msg).toBe("No users found.");
  });
});