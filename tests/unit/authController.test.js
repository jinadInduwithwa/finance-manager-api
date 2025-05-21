import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import {
  signup,
  signin,
  signout,
  sendVerificationCode,
  verifyVerificationCode,
  changePassword,
  sendForgotPasswordCode,
  verifyForgotPasswordCode,
  adminCheck,
} from "../controllers/authController.js";
import { doHash, doHashValidation, hmacProcess } from "../utils/hashing.js";
import transport from "../middleware/sendMail.js";

// Create an Express app for testing
const app = express();
app.use(express.json());

// Define routes for testing
app.post("/api/v1/signup", signup);
app.post("/api/v1/signin", signin);
app.post("/api/v1/signout", signout);
app.post("/api/v1/send-verification-code", sendVerificationCode);
app.post("/api/v1/verify-verification-code", verifyVerificationCode);
app.post("/api/v1/change-password", changePassword);
app.post("/api/v1/send-forgot-password-code", sendForgotPasswordCode);
app.post("/api/v1/verify-forgot-password-code", verifyForgotPasswordCode);
app.get("/api/v1/admin-check", adminCheck);

// Mock the models and utilities
jest.mock("../models/userModel.js");
jest.mock("../utils/hashing.js");
jest.mock("../middleware/sendMail.js");
jest.mock("jsonwebtoken");

describe("signup", () => {
  it("should create a new user", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue(null);
    User.prototype.save.mockResolvedValue({
      _id: "123",
      name: "Test User",
      email: "test@example.com",
      phoneNumber: "1234567890",
      password: undefined, // Password is excluded from the response
    });

    // Mock the hashing function
    doHash.mockResolvedValue("hashedPassword");

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/signup")
      .send({
        name: "Test User",
        email: "test@example.com",
        phoneNumber: "1234567890",
        password: "password123",
      });

    // Assertions
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Your account has been created successfully");
    expect(response.body.result).toEqual({
      _id: "123",
      name: "Test User",
      email: "test@example.com",
      phoneNumber: "1234567890",
    });
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(doHash).toHaveBeenCalledWith("password123", 12);
  });

  it("should return 401 if user already exists", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      name: "Existing User",
      email: "test@example.com",
      phoneNumber: "1234567890",
    });

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/signup")
      .send({
        name: "Test User",
        email: "test@example.com",
        phoneNumber: "1234567890",
        password: "password123",
      });

    // Assertions
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("User already exist !");
  });

  it("should return 401 if validation fails", async () => {
    // Simulate a request with invalid data
    const response = await request(app)
      .post("/api/v1/signup")
      .send({
        name: "",
        email: "invalid-email",
        phoneNumber: "123",
        password: "pass",
      });

    // Assertions
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/Validation error/);
  });
});

describe("signin", () => {
  it("should sign in a user and return a token", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      password: "hashedPassword",
      role: "user",
      verified: true,
    });

    // Mock the hashing and JWT functions
    doHashValidation.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mockToken");

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/signin")
      .send({
        email: "test@example.com",
        password: "password123",
      });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBe("mockToken");
    expect(response.body.message).toBe("Logged in successfully");
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(doHashValidation).toHaveBeenCalledWith("password123", "hashedPassword");
    expect(jwt.sign).toHaveBeenCalled();
  });

  it("should return 401 if user does not exist", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue(null);

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/signin")
      .send({
        email: "test@example.com",
        password: "password123",
      });

    // Assertions
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("User does not exists !");
  });

  it("should return 401 if password is invalid", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      password: "hashedPassword",
    });

    // Mock the hashing function
    doHashValidation.mockResolvedValue(false);

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/signin")
      .send({
        email: "test@example.com",
        password: "wrongPassword",
      });

    // Assertions
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid credentials !");
  });
});

describe("signout", () => {
  it("should clear the Authorization cookie", async () => {
    // Simulate a request
    const response = await request(app).post("/api/v1/signout");

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("logged out successfully");
    expect(response.headers["set-cookie"]).toBeDefined();
  });
});

describe("sendVerificationCode", () => {
  it("should send a verification code", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      verified: false,
    });

    // Mock the email transport
    transport.sendMail.mockResolvedValue({ accepted: ["test@example.com"] });

    // Mock the HMAC function
    hmacProcess.mockReturnValue("hashedCode");

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/send-verification-code")
      .send({ email: "test@example.com" });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Code sent !");
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(transport.sendMail).toHaveBeenCalled();
    expect(hmacProcess).toHaveBeenCalled();
  });

  it("should return 404 if user does not exist", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue(null);

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/send-verification-code")
      .send({ email: "test@example.com" });

    // Assertions
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("User does not exists !");
  });

  it("should return 400 if user is already verified", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      verified: true,
    });

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/send-verification-code")
      .send({ email: "test@example.com" });

    // Assertions
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Your already verified !");
  });
});

describe("verifyVerificationCode", () => {
  it("should verify the verification code", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      verificationCode: "hashedCode",
      verificationCodeValidation: Date.now(),
      verified: false,
      save: jest.fn().mockResolvedValue(true),
    });

    // Mock the HMAC function
    hmacProcess.mockReturnValue("hashedCode");

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/verify-verification-code")
      .send({ email: "test@example.com", providedCode: "123456" });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Your account has been verified!");
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(hmacProcess).toHaveBeenCalledWith("123456", expect.any(String));
  });

  it("should return 400 if code is invalid", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      verificationCode: "hashedCode",
      verificationCodeValidation: Date.now(),
      verified: false,
    });

    // Mock the HMAC function
    hmacProcess.mockReturnValue("wrongHashedCode");

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/verify-verification-code")
      .send({ email: "test@example.com", providedCode: "123456" });

    // Assertions
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid verification code!");
  });

  it("should return 400 if code has expired", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      verificationCode: "hashedCode",
      verificationCodeValidation: Date.now() - 6 * 60 * 1000, // Expired code
      verified: false,
    });

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/verify-verification-code")
      .send({ email: "test@example.com", providedCode: "123456" });

    // Assertions
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Code has expired!");
  });
});

describe("changePassword", () => {
  it("should change the password", async () => {
    // Mock the authenticated user
    const mockUser = { userId: "123", verified: true };

    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      password: "oldHashedPassword",
      save: jest.fn().mockResolvedValue(true),
    });

    // Mock the hashing functions
    doHashValidation.mockResolvedValue(true);
    doHash.mockResolvedValue("newHashedPassword");

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/change-password")
      .set("User", JSON.stringify(mockUser))
      .send({ oldPassword: "oldPassword", newPassword: "newPassword" });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Password updated");
    expect(User.findOne).toHaveBeenCalledWith({ _id: "123" });
    expect(doHashValidation).toHaveBeenCalledWith("oldPassword", "oldHashedPassword");
    expect(doHash).toHaveBeenCalledWith("newPassword", 12);
  });

  it("should return 401 if user is not verified", async () => {
    // Mock the authenticated user
    const mockUser = { userId: "123", verified: false };

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/change-password")
      .set("User", JSON.stringify(mockUser))
      .send({ oldPassword: "oldPassword", newPassword: "newPassword" });

    // Assertions
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("You are not verified user");
  });

  it("should return 400 if old password is invalid", async () => {
    // Mock the authenticated user
    const mockUser = { userId: "123", verified: true };

    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      password: "oldHashedPassword",
    });

    // Mock the hashing function
    doHashValidation.mockResolvedValue(false);

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/change-password")
      .set("User", JSON.stringify(mockUser))
      .send({ oldPassword: "wrongPassword", newPassword: "newPassword" });

    // Assertions
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid credentials");
  });
});

describe("sendForgotPasswordCode", () => {
  it("should send a forgot password code", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
    });

    // Mock the email transport
    transport.sendMail.mockResolvedValue({ accepted: ["test@example.com"] });

    // Mock the HMAC function
    hmacProcess.mockReturnValue("hashedCode");

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/send-forgot-password-code")
      .send({ email: "test@example.com" });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Code sent !");
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(transport.sendMail).toHaveBeenCalled();
    expect(hmacProcess).toHaveBeenCalled();
  });

  it("should return 404 if user does not exist", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue(null);

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/send-forgot-password-code")
      .send({ email: "test@example.com" });

    // Assertions
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("User does not exists !");
  });
});

describe("verifyForgotPasswordCode", () => {
  it("should verify the forgot password code and reset the password", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      forgotPasswordCode: "hashedCode",
      forgotPasswordCodeValidation: Date.now(),
      save: jest.fn().mockResolvedValue(true),
    });

    // Mock the HMAC and hashing functions
    hmacProcess.mockReturnValue("hashedCode");
    doHash.mockResolvedValue("newHashedPassword");

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/verify-forgot-password-code")
      .send({
        email: "test@example.com",
        providedCode: "123456",
        newPassword: "newPassword",
      });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Password reset successfully!");
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(hmacProcess).toHaveBeenCalledWith("123456", expect.any(String));
    expect(doHash).toHaveBeenCalledWith("newPassword", 12);
  });

  it("should return 400 if code is invalid", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      forgotPasswordCode: "hashedCode",
      forgotPasswordCodeValidation: Date.now(),
    });

    // Mock the HMAC function
    hmacProcess.mockReturnValue("wrongHashedCode");

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/verify-forgot-password-code")
      .send({
        email: "test@example.com",
        providedCode: "123456",
        newPassword: "newPassword",
      });

    // Assertions
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Incorrect verification code!");
  });

  it("should return 400 if code has expired", async () => {
    // Mock the database response
    User.findOne.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      forgotPasswordCode: "hashedCode",
      forgotPasswordCodeValidation: Date.now() - 6 * 60 * 1000, // Expired code
    });

    // Simulate a request
    const response = await request(app)
      .post("/api/v1/verify-forgot-password-code")
      .send({
        email: "test@example.com",
        providedCode: "123456",
        newPassword: "newPassword",
      });

    // Assertions
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Code has expired!");
  });
});

describe("adminCheck", () => {
  it("should return admin rights", async () => {
    // Simulate a request
    const response = await request(app).get("/api/v1/admin-check");

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("admin right !");
  });
});