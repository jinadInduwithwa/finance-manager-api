import request from "supertest";
import express from "express";
import { StatusCodes } from "http-status-codes";
import Notification from "../models/notificationModel.js";
import { fetchNotifications } from "../controllers/notificationController.js";

// Create an Express app for testing
const app = express();
app.use(express.json());

// Define the route for testing
app.get("/api/v1/notifications", fetchNotifications);

// Mock the Notification model
jest.mock("../models/notificationModel.js");

describe("fetchNotifications", () => {
  it("should fetch notifications for the user", async () => {
    // Mock the authenticated user
    const mockUserId = "123";
    const mockNotifications = [
      { userId: mockUserId, message: "Notification 1", createdAt: new Date() },
      { userId: mockUserId, message: "Notification 2", createdAt: new Date() },
    ];

    // Mock the database response
    Notification.find.mockResolvedValue(mockNotifications);

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/notifications")
      .set("user", JSON.stringify({ userId: mockUserId }));

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.msg).toBe("Notifications fetched successfully");
    expect(response.body.data).toEqual(mockNotifications);
    expect(Notification.find).toHaveBeenCalledWith({ userId: mockUserId });
    expect(Notification.find).toHaveBeenCalledTimes(1);
  });

  it("should return 500 if an error occurs", async () => {
    // Mock the authenticated user
    const mockUserId = "123";

    // Mock the database to throw an error
    Notification.find.mockRejectedValue(new Error("Database error"));

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/notifications")
      .set("user", JSON.stringify({ userId: mockUserId }));

    // Assertions
    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.msg).toBe("Error fetching notifications");
    expect(response.body.error).toBe("Database error");
    expect(Notification.find).toHaveBeenCalledWith({ userId: mockUserId });
    expect(Notification.find).toHaveBeenCalledTimes(1);
  });
});