import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import User from "../../models/userModel.js";
import Transaction from "../../models/transactionModel.js";
import { getAllUsers, getUserById, updateUser, deleteUser, getAllTransactions  } from "../../controllers/adminController.js";

// Create a mock Express app for testing
const app = express();
app.use(express.json());
app.get("/api/v1/admin/users", getAllUsers);
app.get("/api/v1/admin/users/:id", getUserById);
app.patch("/api/v1/admin/user/:id", updateUser);
app.delete("/api/v1/admin/user/:id", deleteUser);
app.get("/api/v1/admin/transactions", getAllTransactions);

// ----------------------------Test cases for get all user
describe("Admin Controller - getAllUsers", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("should retrieve all users with pagination", async () => {
    await User.create([
      {
        name: "User1",
        email: "user1@test.com",
        password: "password1",
        role: "user",
        verified: true,
        phoneNumber: "1234167890",
      },
      {
        name: "User2",
        email: "user2@test.com",
        password: "password2",
        role: "admin",
        verified: false,
        phoneNumber: "0987654321",
      },
    ]);

    const response = await request(app)
      .get("/api/v1/admin/users")
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.msg).toBe("Users retrieved successfully");
    expect(response.body.data.length).toBe(2);
    expect(response.body.totalUsers).toBe(2);
  });

  it("should return 404 if no users are found", async () => {
    const response = await request(app)
      .get("/api/v1/admin/users")
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(404);
    expect(response.body.msg).toBe("No users found.");
    expect(response.body.totalUsers).toBe(0);
  });
});

// ---------------------------Test cases for getUserById
describe("getUserById", () => {
  it("should retrieve a user by ID", async () => {
    const user = await User.create({
      name: "User1",
      email: "user3@test.com",
      password: "password1",
      role: "user",
      verified: true,
      phoneNumber: "1234567810",
    });

    const response = await request(app).get(`/api/v1/admin/users/${user._id}`);

    expect(response.status).toBe(200);
    expect(response.body.msg).toBe("User retrieved successfully");
    expect(response.body.data._id).toBe(user._id.toString());
  });

  it("should return 404 if user is not found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app).get(`/api/v1/admin/users/${nonExistentId}`);

    expect(response.status).toBe(404);
    expect(response.body.msg).toBe("User not found");
  });
});

// --------------------------Test cases for updateUser
describe("updateUser", () => {
  it("should update a user's role", async () => {
    const user = await User.create({
      name: "Test User",
      email: "user4@test.com",
      password: "password",
      role: "admin",
      verified: true,
      phoneNumber: "1234567890",
    });

    const response = await request(app)
      .patch(`/api/v1/admin/user/${user._id}`)
      .send({ role: "admin" });

    expect(response.status).toBe(200);
    expect(response.body.msg).toBe("User updated successfully");
    expect(response.body.data.role).toBe("admin");
  });

  it("should return 404 if user is not found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .patch(`/api/v1/admin/user/${nonExistentId}`)
      .send({ role: "admin" });

    expect(response.status).toBe(404);
    expect(response.body.msg).toBe("User not found");
  });

  it("should return 400 for invalid input", async () => {
    const user = await User.create({
      name: "Test User",
      email: "user5@test.com",
      password: "password",
      role: "user",
      verified: true,
      phoneNumber: "1234067890",
    });
  
    const response = await request(app)
      .patch(`/api/v1/admin/user/${user._id}`)
      .send({ role: "invalidRole" }); // Assuming "invalidRole" is not allowed
  
    expect(response.status).toBe(400);
    expect(response.body.msg).toBe('"role" must be one of [admin, user]'); // Match the exact Joi error message
  });
});

// --------------------------Test cases for deleteUser
describe("deleteUser", () => {
    beforeEach(async () => {
        await User.deleteMany({});
    });

    it("should delete a user by ID", async () => {
        const user = await User.create({
            name: "Test User",
            email: "test@test.com",
            password: "password",
            role: "user",
            verified: true,
            phoneNumber: "1234567890",
        });

        const response = await request(app).delete(`/api/v1/admin/user/${user._id}`);

        expect(response.status).toBe(200);
        expect(response.body.msg).toBe("User deleted successfully");

        const deletedUser = await User.findById(user._id);
        expect(deletedUser).toBeNull();
    });

    it("should return 404 if user is not found", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app).delete(`/api/v1/admin/user/${nonExistentId}`);

        expect(response.status).toBe(404);
        expect(response.body.msg).toBe("User not found");
    });

    it("should return 500 if an internal server error occurs", async () => {
        jest.spyOn(User, "findByIdAndDelete").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const user = await User.create({
            name: "Test User",
            email: "test@test.com",
            password: "password",
            role: "user",
            verified: true,
            phoneNumber: "1234567890",
        });

        const response = await request(app).delete(`/api/v1/admin/user/${user._id}`);

        expect(response.status).toBe(500);
        expect(response.body.msg).toBe("Error deleting user");
        expect(response.body.error).toBe("Database error");

        jest.restoreAllMocks();
    });
});

// --------------------------Test cases for getAllTransactions
describe("getAllTransactions", () => {
    it("should retrieve all transactions with pagination", async () => {
      const user = await User.create({
        name: "Test User",
        email: "user7@test.com",
        password: "password",
        role: "user",
        verified: true,
        phoneNumber: "7234567890",
      });
  
      await Transaction.create([
        {
          userId: user._id,
          amount: 100,
          category: "Food",
          type: "expense",
          date: new Date("2023-10-01"),
        },
        {
          userId: user._id,
          amount: 200,
          category: "Transport",
          type: "expense",
          date: new Date("2023-10-02"),
        },
      ]);
  
      const response = await request(app).get("/api/v1/admin/transactions").query({ page: 1, limit: 10 });
  
      expect(response.status).toBe(200);
      expect(response.body.msg).toBe("Transactions retrieved successfully");
      expect(response.body.data.length).toBe(2);
      expect(response.body.totalTransactions).toBe(2);
    });
  });