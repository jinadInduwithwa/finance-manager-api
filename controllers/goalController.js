import { StatusCodes } from "http-status-codes";
import { goalSchema, fundGoalSchema } from "../middleware/validator.js";
import Goal from "../models/goalModel.js";
import Transaction from "../models/transactionModel.js"; 
import mongoose from 'mongoose'; // Add this line to import mongoose
import { convertToBaseCurrency , convertFromBaseCurrency } from "../services/currencyService.js";
import { sendEmail } from "../services/emailService.js";

// ----------------------- create goal ------------------------------
export const createGoal = async (req, res) => {
    try {
        const { error, value } = goalSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ msg: error.details[0].message });
        }

        const { name, targetAmount, deadline, currency } = value;
        const BASE_CURRENCY = process.env.BASE_CURRENCY || "LKR";

        // Convert targetAmount to base currency
        const convertedAmount = await convertToBaseCurrency(targetAmount, currency);

        // Create a new goal with converted amount
        const goal = new Goal({
            userId: req.user.userId,
            name,
            targetAmount: convertedAmount,
            deadline,
        });

        await goal.save();

        res.status(StatusCodes.OK).json({
            msg: "Goal created successfully!",
            data: goal,
        });

    } catch (error) {
        console.error("Create Goal Error:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            msg: "Error creating goal",
            error: error.message,
        });
    }
};

// ----------------------- get goal by user ------------------------------
export const getAllGoalsByUser = async (req, res) => {
    try {
        const userGoals = await Goal.find({ userId: req.user.userId });

        if (userGoals.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                msg: "No goals found for this user.",
                data: []
            });
        }

        res.status(StatusCodes.OK).json({
            msg: "User goals retrieved successfully",
            data: userGoals
        });

    } catch (error) {
        console.error("Error fetching user goals:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            msg: "Something went wrong while retrieving goals",
            error: error.message
        });
    }
};

// ----------------------- update goal ------------------------------
export const updateGoal = async (req, res) => {
    try {
        const { id } = req.params;

        const { error, value } = goalSchema.validate(req.body);
        if (error) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: error.details[0].message });
        }

        const goal = await Goal.findOneAndUpdate(
            { _id: id, userId: req.user.userId },
            value,
            { new: true, runValidators: true }
        );

        if (!goal) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: "Goal not found" });
        }

        res.status(StatusCodes.OK).json({ msg: "Goal updated successfully", data: goal });

    } catch (error) {
        console.error("Update Goal Error:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            msg: "Error updating goal",
            error: error.message
        });
    }
};

// ----------------------- delete goal ------------------------------
export const deleteGoal = async (req, res) => {
    try {
        const { id } = req.params;

        const goal = await Goal.findOneAndDelete({ _id: id, userId: req.user.userId });

        if (!goal) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: "Goal not found" });
        }

        res.status(StatusCodes.OK).json({ msg: "Goal deleted successfully" });

    } catch (error) {
        console.error("Delete Goal Error:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            msg: "Error deleting goal",
            error: error.message
        });
    }
};

// ----------------------- Get Goal Statistics with Progress ------------------------------
export const getGoalStats = async (req, res) => {
  try {

    const goals = await Goal.find({ userId: req.user.userId });

    const totalGoals = goals.length;
    const totalTargetAmount = goals.reduce((acc, goal) => acc + goal.targetAmount, 0);
    const totalCurrentAmount = goals.reduce((acc, goal) => acc + goal.currentAmount, 0);
    const completedGoals = goals.filter((goal) => goal.status === "Completed").length;
    
    const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    const goalsWithProgress = goals.map((goal) => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      return {
        ...goal.toObject(),
        progress: progress > 100 ? 100 : Math.round(progress),
      };
    });
    res.status(StatusCodes.OK).json({
      msg: "Goal statistics retrieved successfully",
      data: {
        totalGoals,
        totalTargetAmount,
        totalCurrentAmount,
        completedGoals,
        completionRate,
       // goals: goalsWithProgress, //  Include goals with progress tracking
      },
    });

  } catch (error) {
    console.error("Error fetching goal stats:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Error fetching goal stats",
      error: error.message,
    });
  }
};

// ----------------------- add fund to goal ------------------------------
export const addFundToGoal = async (req, res) => {
  try {
      const { id } = req.params; 
      const { error, value } = fundGoalSchema.validate(req.body);
      const { amount, currency } = value; 
      const userId = req.user.userId;

      // Validate the amount
      if (!amount || amount <= 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({ msg: "Invalid amount. Must be greater than 0" });
      }

      // Convert the funding amount to base currency
      let convertedAmount;
      try {
          convertedAmount = await convertToBaseCurrency(amount, currency);
          console.log(`Converted ${amount} ${currency} to ${convertedAmount} ${process.env.BASE_CURRENCY}`);
      } catch (conversionError) {
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
              msg: "Error converting currency",
              error: conversionError.message,
          });
      }

      // Find the Savings Goal for the user
      const savingsGoal = await Goal.findOne({ userId, name: "Savings Goal" });
      if (!savingsGoal) {
          return res.status(StatusCodes.NOT_FOUND).json({ msg: "Savings Goal not found" });
      }

      // Check if the converted funding amount exceeds the Savings Goal's currentAmount
      if (convertedAmount > savingsGoal.currentAmount) {
          return res.status(StatusCodes.BAD_REQUEST).json({
              msg: "Insufficient funds in Savings Goal",
              savingsGoalCurrentAmount: savingsGoal.currentAmount,
              requestedAmount: convertedAmount,
              baseCurrency: process.env.BASE_CURRENCY,
          });
      }

      // Find the goal to fund by ID and userId
      const goalToFund = await Goal.findOne({ _id: id, userId });
      if (!goalToFund) {
          return res.status(StatusCodes.NOT_FOUND).json({ msg: "Goal to fund not found" });
      }

      // Add the converted amount to the goal's currentAmount
      goalToFund.currentAmount += convertedAmount;

      // If the goal is completed, update the status and send an email
      if (goalToFund.currentAmount >= goalToFund.targetAmount) {
          goalToFund.currentAmount = goalToFund.targetAmount; // Cap the current amount at the target amount
          goalToFund.status = "Completed";

          // Send email notification for goal completion
          const subject = "Goal Completed!";
          const message = `Congratulations! You have successfully completed your goal: <strong>${goalToFund.name}</strong>.`;
          await sendEmail(userId, subject, message);
      }

      // Reduce the converted amount from the Savings Goal's currentAmount
      savingsGoal.currentAmount -= convertedAmount;

      // If the Savings Goal's currentAmount drops to 0 or below, update its status
      if (savingsGoal.currentAmount <= 0) {
          savingsGoal.currentAmount = 0;
          savingsGoal.status = "In Progress"; // Reset status if needed
      }

      // Save both goals after updating them
      await goalToFund.save();
      await savingsGoal.save();

      // Return success response
      res.status(StatusCodes.OK).json({
          msg: "Goal funded successfully",
          data: {
              fundedGoal: goalToFund,
              savingsGoal: savingsGoal,
              convertedAmount: convertedAmount,
              baseCurrency: process.env.BASE_CURRENCY,
          },
      });

  } catch (error) {
      console.error("Error funding goal:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          msg: "Error funding goal",
          error: error.message,
      });
  }
};