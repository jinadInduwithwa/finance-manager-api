import { StatusCodes } from "http-status-codes";
import Notification from "../models/notificationModel.js";

//-------------------- fetch notification -----------------------
export const fetchNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Fetch all notifications for the user, sorted by latest first
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

        // Return JSON response
        return res.status(StatusCodes.OK).json({
            msg: "Notifications fetched successfully",
            data: notifications,
        });

    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            msg: "Error fetching notifications",
            error: error.message,
        });
    }
};