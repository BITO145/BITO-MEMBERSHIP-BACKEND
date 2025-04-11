import { Router } from "express";
import { enrollMemberInChapter } from "../controllers/enrollmentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Endpoint for a member to enroll in a chapter
router.post("/enroll-chapter", protect, enrollMemberInChapter);

export default router;
