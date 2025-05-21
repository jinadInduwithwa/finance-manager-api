import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import Settings from "../../models/settingModel.js";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../../controllers/settingController.js";

// Create an Express app for testing
const app = express();
app.use(express.json());

// Define routes for testing
app.post("/api/v1/categories", createCategory);
app.get("/api/v1/categories", getCategories);
app.patch("/api/v1/categories/:id", updateCategory);
app.delete("/api/v1/categories/:id", deleteCategory);

// Mock the Settings model
jest.mock("../../models/settingModel.js");

describe("getCategories", () => {
  it("should retrieve all categories", async () => {
    // Mock the database response
    Settings.findOne.mockResolvedValue({
      categories: [
        { name: "Books", type: "expense" },
        { name: "Clothing", type: "expense" },
      ],
    });

    const response = await request(app).get("/api/v1/categories");

    expect(response.status).toBe(200);
    expect(response.body.msg).toBe("Categories retrieved successfully");
    expect(response.body.data.length).toBe(2);
  });

  it("should return 404 if no categories are found", async () => {
    // Mock the database response
    Settings.findOne.mockResolvedValue(null);

    const response = await request(app).get("/api/v1/categories");

    expect(response.status).toBe(404);
    expect(response.body.msg).toBe("No categories found");
    expect(response.body.data).toBeUndefined(); // No data should be returned
  });
});

describe("updateCategory", () => {
  it("should update a category by ID", async () => {
    // Mock the database response
    const mockCategory = { _id: "123", name: "Groceries", type: "expense" };
    Settings.findOne.mockResolvedValue({
      categories: [mockCategory],
      save: jest.fn().mockResolvedValue(true),
    });

    const response = await request(app)
      .patch(`/api/v1/categories/${mockCategory._id}`)
      .send({ name: "Supermarket", type: "expense" });

    expect(response.status).toBe(200);
    expect(response.body.msg).toBe("Category updated successfully");
    expect(response.body.data.name).toBe("Supermarket");
  });

  it("should return 404 if category is not found", async () => {
    // Mock the database response
    Settings.findOne.mockResolvedValue(null);

    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .patch(`/api/v1/categories/${nonExistentId}`)
      .send({ name: "Updated Category" });

    expect(response.status).toBe(400);
    expect(response.body.msg).toBe("Category not found");
  });
});

describe("deleteCategory", () => {
  it("should delete a category by ID", async () => {
    // Mock the database response
    const mockCategory = { _id: "123", name: "Entertainment", type: "expense" };
    Settings.findOne.mockResolvedValue({
      categories: [mockCategory],
      save: jest.fn().mockResolvedValue(true),
    });

    const response = await request(app).delete(`/api/v1/categories/${mockCategory._id}`);

    expect(response.status).toBe(200);
    expect(response.body.msg).toBe("Category deleted successfully");
  });

  it("should return 404 if category is not found", async () => {
    // Mock the database response
    Settings.findOne.mockResolvedValue(null);

    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app).delete(`/api/v1/categories/${nonExistentId}`);

    expect(response.status).toBe(404);
    expect(response.body.msg).toBe("Settings not found");
  });
});