import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../../models/userModel.js";
import Budget from "../../models/budgetModel.js";
import Transaction from "../../models/transactionModel.js";
import Settings from "../../models/settingModel.js";
import {
  setBudget,
  updateBudget,
  deleteBudget,
  getAllBudgets,
  getBudgetByFilter,
  getBudgetRecommendations,
} from "../../controllers/budgetController.js";

// Create a mock Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { userId: mockUser.userId }; // Inject mock user
  next();
});

// Attach routes
app.post("/api/v1/budget", setBudget);
app.patch("/api/v1/budget/:id", updateBudget);
app.delete("/api/v1/budget/:id", deleteBudget);
app.get("/api/v1/budgets", getAllBudgets);
app.get("/api/v1/budgets/filter", getBudgetByFilter);
app.get("/api/v1/budgets/recommendations", getBudgetRecommendations);

// Mock user for authentication
const mockUser = {
  userId: new mongoose.Types.ObjectId(),
};

// Mock settings for categories
const mockSettings = {
  categories: [
    { name: "Food", active: true, type: "expense" },
    { name: "Transport", active: true, type: "expense" },
  ],
};

// Mock currency conversion functions
jest.mock("../../services/currencyService.js", () => ({
  convertToBaseCurrency: jest.fn((amount) => amount),
  convertFromBaseCurrency: jest.fn((amount) => amount),
}));

// Increase the timeout for MongoDB Memory Server
jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
  console.log("Starting MongoDB Memory Server...");
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 60000, // 60 seconds
    },
  });
  const uri = mongoServer.getUri();
  console.log("MongoDB Memory Server started at:", uri);

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB Memory Server");
});

beforeEach(async () => {
  await Budget.deleteMany({});
  await Settings.deleteMany({});
  await Settings.create(mockSettings);
});

afterAll(async () => {
  console.log("Stopping MongoDB Memory Server...");
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
  console.log("MongoDB Memory Server stopped");
});

// ----------------------- Test Cases for setBudget ------------------------------
describe("Budget Controller - setBudget", () => {
  it("should create a new budget", async () => {
    const budgetData = {
      category: "Food",
      amount: 1000,
      duration: "monthly",
      currency: "USD",
    };

    const response = await request(app)
      .post("/api/v1/budget")
      .send(budgetData);

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.msg).toBe("Budget set successfully!");
    expect(response.body.data.category).toBe(budgetData.category);
    expect(response.body.data.amount).toBe(budgetData.amount);
  });

  it("should return 400 for invalid category", async () => {
    const budgetData = {
      category: "InvalidCategory",
      amount: 1000,
      duration: "monthly",
      currency: "USD",
    };

    const response = await request(app)
      .post("/api/v1/budget")
      .send(budgetData);

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body.msg).toBe("Invalid or inactive category");
  });

  it("should return 409 if budget already exists for the category", async () => {
    const budgetData = {
      category: "Food",
      amount: 1000,
      duration: "monthly",
      currency: "USD",
    };

    await request(app).post("/api/v1/budget").send(budgetData);

    const response = await request(app)
      .post("/api/v1/budget")
      .send(budgetData);

    expect(response.status).toBe(StatusCodes.CONFLICT);
    expect(response.body.msg).toBe("Budget already exists for this category.");
  });
});

// ----------------------- Test Cases for updateBudget ------------------------------
describe("Budget Controller - updateBudget", () => {
  it("should update an existing budget", async () => {
    const budget = await Budget.create({
      userId: mockUser.userId,
      category: "Food",
      amount: 1000,
      duration: "monthly",
    });

    const updateData = {
      category: "Food",
      amount: 1500,
      duration: "monthly",
      currency: "USD",
    };

    const response = await request(app)
      .patch(`/api/v1/budget/${budget._id}`)
      .send(updateData);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.msg).toBe("Budget updated successfully!");
    expect(response.body.data.amount).toBe(updateData.amount);
  });

  it("should return 404 if budget is not found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const updateData = {
      category: "Food",
      amount: 1500,
      duration: "monthly",
      currency: "USD",
    };

    const response = await request(app)
      .patch(`/api/v1/budget/${nonExistentId}`)
      .send(updateData);

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.msg).toBe("Budget not found");
  });
});

// ----------------------- Test Cases for deleteBudget ------------------------------
describe("Budget Controller - deleteBudget", () => {
  it("should delete an existing budget", async () => {
    const budget = await Budget.create({
      userId: mockUser.userId,
      category: "Food",
      amount: 1000,
      duration: "monthly",
    });

    const response = await request(app)
      .delete(`/api/v1/budget/${budget._id}`);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.msg).toBe("Budget deleted successfully");

    const deletedBudget = await Budget.findById(budget._id);
    expect(deletedBudget).toBeNull();
  });

  it("should return 404 if budget is not found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`/api/v1/budget/${nonExistentId}`);

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.msg).toBe("Budget not found");
  });
});

// ----------------------- Test Cases for getAllBudgets ------------------------------
describe("Budget Controller - getAllBudgets", () => {
  it("should retrieve all budgets with pagination", async () => {
    await Budget.create([
      {
        userId: mockUser.userId,
        category: "Food",
        amount: 1000,
        duration: "monthly",
      },
      {
        userId: mockUser.userId,
        category: "Transport",
        amount: 500,
        duration: "monthly",
      },
    ]);

    const response = await request(app)
      .get("/api/v1/budgets")
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.msg).toBe("Budgets retrieved successfully");
    expect(response.body.data.length).toBe(2);
    expect(response.body.pagination.totalCount).toBe(2);
  });

  it("should return 404 if no budgets are found", async () => {
    const response = await request(app)
      .get("/api/v1/budgets")
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.msg).toBe("No budgets found.");
  });
});

// ----------------------- Test Cases for getBudgetByFilter ------------------------------
describe("Budget Controller - getBudgetByFilter", () => {
  it("should retrieve budgets by category filter", async () => {
    await Budget.create([
      {
        userId: mockUser.userId,
        category: "Food",
        amount: 1000,
        duration: "monthly",
      },
      {
        userId: mockUser.userId,
        category: "Transport",
        amount: 500,
        duration: "monthly",
      },
    ]);

    const response = await request(app)
      .get("/api/v1/budgets/filter")
      .query({ category: "Food", page: 1, limit: 10 });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.msg).toBe("Budgets retrieved successfully");
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].category).toBe("Food");
  });

  it("should return 404 if no budgets match the filter", async () => {
    const response = await request(app)
      .get("/api/v1/budgets/filter")
      .query({ category: "InvalidCategory", page: 1, limit: 10 });

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.msg).toBe("No budgets found for the given filters");
  });
});

// ----------------------- Test Cases for getBudgetRecommendations ------------------------------
describe("Budget Controller - getBudgetRecommendations", () => {
  it("should generate budget recommendations", async () => {
    const budget = await Budget.create({
      userId: mockUser.userId,
      category: "Food",
      amount: 1000,
      duration: "monthly",
    });

    await Transaction.create({
      userId: mockUser.userId,
      category: "Food",
      amount: 900,
      type: "expense",
      date: new Date(),
    });

    const response = await request(app)
      .get("/api/v1/budgets/recommendations");

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.msg).toBe("Budget recommendations generated successfully");
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].category).toBe("Food");
    expect(response.body.data[0].percentage).toBe(90);
  });

  it("should return 404 if no budgets are found", async () => {
    const response = await request(app)
      .get("/api/v1/budgets/recommendations");

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.msg).toBe("No budgets found for the user.");
  });
});