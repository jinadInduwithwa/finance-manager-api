import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../server.js"; 
import Transaction from "../../models/transactionModel.js";
import User from "../../models/userModel.js";
import Settings from "../models/settingModel.js";
import Goal from "../../models/goalModel.js";
import { generateToken } from "../utils/jwtHelper.js";

let mongoServer;
let userToken;
let userId;

beforeAll(async () => {
    // Start MongoDB in-memory server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    // Create a mock user
    const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
    });

    userId = user._id;
    userToken = generateToken(userId); // Generate mock JWT

    // Mock settings for categories
    await Settings.create({
        categories: [
            { name: "Food", type: "expense", active: true },
            { name: "Salary", type: "income", active: true },
        ],
    });
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

describe("Transaction API", () => {
    let transactionId;

    // Test: Create Transaction
    test("POST /api/transactions - should create a transaction", async () => {
        const res = await request(app)
            .post("/api/transactions")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                type: "income",
                amount: 5000,
                category: "Salary",
                description: "Salary for March",
                date: "2025-03-01",
                recurring: { isRecurring: false },
                currency: "USD",
            });

        expect(res.status).toBe(201);
        expect(res.body.data).toHaveProperty("_id");
        transactionId = res.body.data._id; // Store transaction ID for later tests
    });

    // Test: Get User Transactions
    test("GET /api/transactions - should retrieve user transactions", async () => {
        const res = await request(app)
            .get("/api/transactions")
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    // Test: Get Transaction by ID
    test("GET /api/transactions/:id - should retrieve a transaction by ID", async () => {
        const res = await request(app)
            .get(`/api/transactions/${transactionId}`)
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(transactionId);
    });

    // Test: Filter Transactions by Date
    test("GET /api/transactions/filter - should filter transactions by date range", async () => {
        const res = await request(app)
            .get("/api/transactions/filter?startDate=2025-03-01&endDate=2025-03-10")
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    // Test: Filter Transactions by Category
    test("GET /api/transactions/filter - should filter transactions by category", async () => {
        const res = await request(app)
            .get("/api/transactions/filter?category=Salary")
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].category).toBe("Salary");
    });

    // Test: Sort Transactions by Tags
    test("GET /api/transactions/sort-by-tags - should return transactions sorted by tags", async () => {
        const res = await request(app)
            .get("/api/transactions/sort-by-tags?tags=work&sortOrder=asc")
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.status).toBe(200);
    });
});
