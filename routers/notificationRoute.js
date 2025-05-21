import express from "express";
import { fetchNotifications } from "../controllers/notificationController.js";
import { identifierUser } from "../middleware/identification.js";

const router = express.Router();

router.get("/", identifierUser, fetchNotifications);

export default router;
