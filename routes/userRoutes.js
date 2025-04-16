import express from "express";
import { getChapters, getEvents } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/events", protect, getEvents);

router.get("/chapters", getChapters);

export default router;
