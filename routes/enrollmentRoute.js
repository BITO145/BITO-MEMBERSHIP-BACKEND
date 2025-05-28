import { Router } from "express";
import {
  enrollMemberInChapter,
  enrollMemberInEvent,
  enrollMemberInOpp,
} from "../controllers/enrollmentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { getMemberEnrolledEvents } from "../controllers/userController.js";

const router = Router();

// Endpoint for a member to enroll in a chapter
router.post("/enroll-chapter", protect, enrollMemberInChapter);

//enroll member in event
router.post("/enroll-event", protect, enrollMemberInEvent);

router.post("/enroll-opp", protect, enrollMemberInOpp);
router.get('/:memberId/events', getMemberEnrolledEvents);

export default router;
