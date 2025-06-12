import express from "express";
import {
  getChapters,
  getEvents,
  getMemberEnrolledEvents,
  getMembersCount,
  getOpportunities,
  getPastEvents,
  getUserTransactions,
  updateProfile,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.get("/events", protect, getEvents);

router.get("/past-events", protect, getPastEvents);

router.get("/chapters", protect, getChapters);

router.get("/opportunities", protect, getOpportunities);

router.get("/members", getMembersCount);

router.get("/:memberId/events", protect, getMemberEnrolledEvents);

router.post("/update", protect, upload.single("image"), updateProfile);

router.get("/txn", protect, getUserTransactions);

export default router;
