import request from "supertest";
import express from "express";
import { StatusCodes } from "http-status-codes";
import Transaction from "../models/transactionModel.js";
import Report from "../models/reportModel.js";
import Goal from "../models/goalModel.js";
import {
  generateReport,
  generateSummaryReport,
  generateGoalProgressReport,
} from "../controllers/reportController.js";
import {
  createPDFReport,
  createPDFSummary,
  createPDFGoalProgressReport,
} from "../services/createPDFReportService.js";
import { convertFromBaseCurrency } from "../services/currencyService.js";
import fs from "fs";
import path from "path";

// Create an Express app for testing
const app = express();
app.use(express.json());

// Define routes for testing
app.get("/api/v1/reports", generateReport);
app.get("/api/v1/reports/summary", generateSummaryReport);
app.get("/api/v1/reports/goal-progress", generateGoalProgressReport);

// Mock the models and services
jest.mock("../models/transactionModel.js");
jest.mock("../models/reportModel.js");
jest.mock("../models/goalModel.js");
jest.mock("../services/createPDFReportService.js");
jest.mock("../services/currencyService.js");

describe("generateReport", () => {
  it("should generate a JSON report", async () => {
    // Mock the authenticated user
    const mockUserId = "123";
    const mockTransactions = [
      { userId: mockUserId, type: "income", amount: 1000, category: "Salary", date: new Date() },
      { userId: mockUserId, type: "expense", amount: 500, category: "Food", date: new Date() },
    ];

    // Mock the database responses
    Transaction.find.mockResolvedValue(mockTransactions);
    Report.create.mockResolvedValue({});

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/reports")
      .set("user", JSON.stringify({ userId: mockUserId }))
      .query({ format: "json" });

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.msg).toBe("Report generated successfully");
    expect(response.body.data).toEqual({
      totalIncome: 1000,
      totalExpense: 500,
      netBalance: 500,
      categoryBreakdown: {
        Salary: { income: 1000, expense: 0 },
        Food: { income: 0, expense: 500 },
      },
    });
    expect(Transaction.find).toHaveBeenCalledWith({ userId: mockUserId });
    expect(Report.create).toHaveBeenCalled();
  });

  it("should generate a PDF report", async () => {
    // Mock the authenticated user
    const mockUserId = "123";
    const mockTransactions = [
      { userId: mockUserId, type: "income", amount: 1000, category: "Salary", date: new Date() },
      { userId: mockUserId, type: "expense", amount: 500, category: "Food", date: new Date() },
    ];

    // Mock the database responses
    Transaction.find.mockResolvedValue(mockTransactions);
    Report.create.mockResolvedValue({ _id: "report123" });

    // Mock the PDF generation
    const mockPdfPath = path.join("reports", "report_report123.pdf");
    createPDFReport.mockResolvedValue(mockPdfPath);

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/reports")
      .set("user", JSON.stringify({ userId: mockUserId }))
      .query({ format: "pdf" });

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toBe("attachment; filename=report_report123.pdf");
    expect(createPDFReport).toHaveBeenCalled();
  });

  it("should return 500 if an error occurs", async () => {
    // Mock the authenticated user
    const mockUserId = "123";

    // Mock the database to throw an error
    Transaction.find.mockRejectedValue(new Error("Database error"));

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/reports")
      .set("user", JSON.stringify({ userId: mockUserId }));

    // Assertions
    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.msg).toBe("Error generating report");
    expect(response.body.error).toBe("Database error");
  });
});

describe("generateSummaryReport", () => {
  it("should generate a JSON summary report", async () => {
    // Mock the authenticated user
    const mockUserId = "123";
    const mockTransactions = [
      { userId: mockUserId, type: "income", amount: 1000, category: "Salary", date: new Date() },
      { userId: mockUserId, type: "expense", amount: 500, category: "Food", date: new Date() },
    ];

    // Mock the database responses
    Transaction.find.mockResolvedValue(mockTransactions);
    convertFromBaseCurrency.mockResolvedValue(1000); // Mock currency conversion

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/reports/summary")
      .set("user", JSON.stringify({ userId: mockUserId }))
      .query({ format: "json", currency: "USD" });

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.msg).toBe("Summary report generated successfully");
    expect(response.body.data).toEqual({
      startDate: undefined,
      endDate: undefined,
      totalIncome: 1000,
      totalExpense: 1000,
      netBalance: 0,
      transactions: [
        { date: mockTransactions[0].date, category: "Salary", type: "income", amount: 1000 },
        { date: mockTransactions[1].date, category: "Food", type: "expense", amount: 1000 },
      ],
    });
    expect(Transaction.find).toHaveBeenCalledWith({ userId: mockUserId });
    expect(convertFromBaseCurrency).toHaveBeenCalled();
  });

  it("should generate a PDF summary report", async () => {
    // Mock the authenticated user
    const mockUserId = "123";
    const mockTransactions = [
      { userId: mockUserId, type: "income", amount: 1000, category: "Salary", date: new Date() },
      { userId: mockUserId, type: "expense", amount: 500, category: "Food", date: new Date() },
    ];

    // Mock the database responses
    Transaction.find.mockResolvedValue(mockTransactions);
    convertFromBaseCurrency.mockResolvedValue(1000); // Mock currency conversion

    // Mock the PDF generation
    const mockPdfPath = path.join("reports", "summary_report_123456789.pdf");
    createPDFSummary.mockResolvedValue(mockPdfPath);

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/reports/summary")
      .set("user", JSON.stringify({ userId: mockUserId }))
      .query({ format: "pdf", currency: "USD" });

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toMatch(/attachment; filename=summary_report_\d+\.pdf/);
    expect(createPDFSummary).toHaveBeenCalled();
  });

  it("should return 500 if an error occurs", async () => {
    // Mock the authenticated user
    const mockUserId = "123";

    // Mock the database to throw an error
    Transaction.find.mockRejectedValue(new Error("Database error"));

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/reports/summary")
      .set("user", JSON.stringify({ userId: mockUserId }));

    // Assertions
    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.msg).toBe("Error generating summary report");
    expect(response.body.error).toBe("Database error");
  });
});

describe("generateGoalProgressReport", () => {
  it("should generate a JSON goal progress report", async () => {
    // Mock the authenticated user
    const mockUserId = "123";
    const mockGoals = [
      { userId: mockUserId, targetAmount: 1000, currentAmount: 500 },
      { userId: mockUserId, targetAmount: 2000, currentAmount: 1000 },
    ];

    // Mock the database responses
    Goal.find.mockResolvedValue(mockGoals);

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/reports/goal-progress")
      .set("user", JSON.stringify({ userId: mockUserId }))
      .query({ format: "json" });

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.msg).toBe("Goal progress report generated successfully");
    expect(response.body.data).toEqual([
      { ...mockGoals[0].toObject(), progress: 50 },
      { ...mockGoals[1].toObject(), progress: 50 },
    ]);
    expect(Goal.find).toHaveBeenCalledWith({ userId: mockUserId });
  });

  it("should generate a PDF goal progress report", async () => {
    // Mock the authenticated user
    const mockUserId = "123";
    const mockGoals = [
      { userId: mockUserId, targetAmount: 1000, currentAmount: 500 },
      { userId: mockUserId, targetAmount: 2000, currentAmount: 1000 },
    ];

    // Mock the database responses
    Goal.find.mockResolvedValue(mockGoals);

    // Mock the PDF generation
    const mockPdfPath = path.join("reports", "goal_progress_report_123456789.pdf");
    createPDFGoalProgressReport.mockResolvedValue(mockPdfPath);

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/reports/goal-progress")
      .set("user", JSON.stringify({ userId: mockUserId }))
      .query({ format: "pdf" });

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toMatch(/attachment; filename=goal_progress_report_\d+\.pdf/);
    expect(createPDFGoalProgressReport).toHaveBeenCalled();
  });

  it("should return 500 if an error occurs", async () => {
    // Mock the authenticated user
    const mockUserId = "123";

    // Mock the database to throw an error
    Goal.find.mockRejectedValue(new Error("Database error"));

    // Simulate an authenticated request
    const response = await request(app)
      .get("/api/v1/reports/goal-progress")
      .set("user", JSON.stringify({ userId: mockUserId }));

    // Assertions
    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.msg).toBe("Error generating goal progress report");
    expect(response.body.error).toBe("Database error");
  });
});