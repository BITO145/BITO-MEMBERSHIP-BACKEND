import express from "express";
import {
  getChapters,
  getEvents,
  getMembersCount,
  updateProfile,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/events", protect, getEvents);

router.get("/chapters", protect, getChapters);

router.get("/members", getMembersCount);

router.post("/update", protect, updateProfile);

export default router;
