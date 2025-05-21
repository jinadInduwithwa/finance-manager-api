import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import Goal from "../../models/goalModel.js";
import { createGoal, getAllGoalsByUser, updateGoal, deleteGoal, getGoalStats, addFundToGoal } from "../../controllers/goalController.js";

// Create a mock Express app for testing
const app = express();
app.use(express.json());

// Mock user ID for authentication
const mockUserId = new mongoose.Types.ObjectId();
app.use((req, res, next) => {
    req.user = { userId: mockUserId }; 
    next();
});

// Define your routes for testing
app.post("/api/v1/goals", createGoal);
app.get("/api/v1/goals", getAllGoalsByUser);
app.patch("/api/v1/goals/:id", updateGoal);
app.delete("/api/v1/goals/:id", deleteGoal);
app.get("/api/v1/goals/stats", getGoalStats);
app.patch("/api/v1/goals/:id/fund", addFundToGoal);

// Mock external services
jest.mock('../../services/currencyService.js', () => ({
    convertToBaseCurrency: jest.fn((amount, currency) => Promise.resolve(amount)),
}));

jest.mock('../../services/emailService.js', () => ({
    sendEmail: jest.fn(() => Promise.resolve()),
}));

describe("Goal Controller Tests", () => {
    beforeEach(async () => {
        await Goal.deleteMany({});
    });

    describe("createGoal", () => {
        it("should create a new goal", async () => {
            const response = await request(app)
                .post("/api/v1/goals")
                .send({
                    name: "Savings Goal",
                    targetAmount: 1000,
                    currency: "LKR",
                    deadline: new Date(Date.now() + 86400000) // Valid future date
                });

            expect(response.status).toBe(200);
            expect(response.body.msg).toBe("Goal created successfully!");
            expect(response.body.data).toHaveProperty("_id");
            expect(response.body.data.name).toBe("Savings Goal");
        });

        it("should return 400 for invalid target amount", async () => {
            const response = await request(app)
                .post("/api/v1/goals")
                .send({
                    name: "Goal",
                    targetAmount: -100,
                    currency: "LKR"
                });

            expect(response.status).toBe(400);
            expect(response.body.msg).toBe('"targetAmount" must be a positive number');
        });

        it("should return 400 for invalid name length", async () => {
            const response = await request(app)
                .post("/api/v1/goals")
                .send({
                    name: "Go", // Invalid name length
                    targetAmount: 1000,
                    currency: "LKR",
                    deadline: new Date(Date.now() + 86400000)
                });

            expect(response.status).toBe(400);
            expect(response.body.msg).toBe('"name" length must be at least 3 characters long');
        });

        it("should return 400 for deadline not in the future", async () => {
            const response = await request(app)
                .post("/api/v1/goals")
                .send({
                    name: "Valid Goal",
                    currency: "LKR",
                    targetAmount: 1000,
                    deadline: new Date(Date.now() - 86400000) // Invalid past date
                });

            expect(response.status).toBe(400);
            expect(response.body.msg).toBe('"deadline" must be greater than "now"');
        });
    });

    describe("getAllGoalsByUser", () => {
        it("should retrieve all goals for a user", async () => {
            await Goal.create([
                { userId: mockUserId, name: "Goal1", targetAmount: 1000 },
                { userId: mockUserId, name: "Goal2", targetAmount: 2000 }
            ]);

            const response = await request(app).get("/api/v1/goals");

            expect(response.status).toBe(200);
            expect(response.body.msg).toBe("User goals retrieved successfully");
            expect(response.body.data.length).toBe(2);
        });

        it("should return 404 if no goals are found", async () => {
            const response = await request(app).get("/api/v1/goals");
            expect(response.status).toBe(404);
            expect(response.body.msg).toBe("No goals found for this user.");
        });
    });

    describe("updateGoal", () => {
        it("should update an existing goal", async () => {
            const goal = await Goal.create({
                userId: mockUserId,
                name: "Goal to Update",
                currency: "LKR",
                targetAmount: 5000,
            });

            const response = await request(app)
                .patch(`/api/v1/goals/${goal._id}`)
                .send({ name: "Updated Goal", targetAmount: 6000 });

            expect(response.status).toBe(200);
            expect(response.body.msg).toBe("Goal updated successfully");
            expect(response.body.data.name).toBe("Updated Goal");
        });

        it("should return 404 if goal is not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId(); // Generate a new ID
            const response = await request(app)
                .patch(`/api/v1/goals/${nonExistentId}`)
                .send({ name: "Updated Goal" });

            expect(response.body.msg).toBe("Goal not found");
        });
    });

    describe("deleteGoal", () => {
        it("should delete an existing goal", async () => {
            const goal = await Goal.create({
                userId: mockUserId,
                name: "Goal to Delete",
                targetAmount: 1000,
            });

            const response = await request(app).delete(`/api/v1/goals/${goal._id}`);

            expect(response.status).toBe(200);
            expect(response.body.msg).toBe("Goal deleted successfully");

            const deletedGoal = await Goal.findById(goal._id);
            expect(deletedGoal).toBeNull();
        });

        it("should return 404 if goal is not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId(); // Generate a new ID
            const response = await request(app).delete(`/api/v1/goals/${nonExistentId}`);

            expect(response.status).toBe(404);
            expect(response.body.msg).toBe("Goal not found");
        });
    });

    describe("getGoalStats", () => {
        it("should retrieve goal statistics", async () => {
            await Goal.create([
                { userId: mockUserId, name: "Goal1", targetAmount: 1000, currentAmount: 500, status: "In Progress" },
                { userId: mockUserId, name: "Goal2", targetAmount: 2000, currentAmount: 2000, status: "Completed" }
            ]);

            const response = await request(app).get("/api/v1/goals/stats");

            expect(response.status).toBe(200);
            expect(response.body.msg).toBe("Goal statistics retrieved successfully");
            expect(response.body.data.totalGoals).toBe(2);
            expect(response.body.data.completedGoals).toBe(1);
            expect(response.body.data.completionRate).toBe(50);
        });
    });

    describe("addFundToGoal", () => {

        it("should return 404 if the goal to fund is not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId(); 
            const goal = await Goal.create({
                userId: mockUserId,
                name: "Test Goal",
                targetAmount: 1000,
                currentAmount: 900,
            });
            const response = await request(app)
                .patch(`/api/v1/goals/${goal._id}/fund`)
                .send({ amount: 200, currency: "LKR" });

            expect(response.status).toBe(404);
        });

        it("should return 400 if insufficient funds in Savings Goal", async () => {
            const goal = await Goal.create({
                userId: mockUserId,
                name: "Savings Goal",
                targetAmount: 1000,
                currentAmount: 500,
            });

            const response = await request(app)
                .patch(`/api/v1/goals/${goal._id}/fund`)
                .send({ amount: 600, currency: "LKR" }); // Try to add more than available

            expect(response.status).toBe(400);
            expect(response.body.msg).toBe("Insufficient funds in Savings Goal");
        });
    });
});