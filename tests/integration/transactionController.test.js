import request from "supertest";
import app from "../app"; // Import your Express app
import User from "../models/userModel.js";
import { StatusCodes } from "http-status-codes";

describe("Transaction Controller Integration Tests", () => {
  // Test data
  const testUser = {
    name: "John Doe",
    email: "john@example.com",
    phoneNumber: "1234567890",
    password: "password123",
  };

  const testTransaction = {
    type: "expense",
    amount: 100,
    category: "Food",
    description: "Lunch",
    tags: ["food", "lunch"],
    date: new Date(),
  };

  let authToken;

  // Add a test user and get an auth token before each test
  beforeEach(async () => {
    const user = await User.create(testUser);
    const loginResponse = await request(app)
      .post("/api/auth/signin")
      .send({ email: testUser.email, password: testUser.password });

    authToken = loginResponse.body.token;
  });

  // Test POST /api/transactions
  it("should create a new transaction", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send(testTransaction);

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.msg).toBe("Transaction added!");
    expect(response.body.data.type).toBe(testTransaction.type);
    expect(response.body.data.amount).toBe(testTransaction.amount);
  });

  // Test POST /api/transactions with invalid data
  it("should return 400 for invalid transaction data", async () => {
    const invalidTransaction = { ...testTransaction, type: "invalid" };
    const response = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send(invalidTransaction);

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body.msg).toContain("Invalid transaction type");
  });
});