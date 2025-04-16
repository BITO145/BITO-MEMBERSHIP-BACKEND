import { Router } from "express";
import {
  enrollMemberInChapter,
  enrollMemberInEvent,
} from "../controllers/enrollmentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Endpoint for a member to enroll in a chapter
router.post("/enroll-chapter", protect, enrollMemberInChapter);

//enroll member in event
router.post("/enroll-event", protect, enrollMemberInEvent);

export default router;
