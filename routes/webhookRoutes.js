import express from "express";
import {
  receiveEventWebhook,
  receiveChapterWebhook,
  updateMemberRole,
  deleteChapter,
  deleteEvent,
  receiveOpp,
} from "../controllers/webhookController.js";

const router = express.Router();

// Webhook route to receive event data
router.post("/events/receive", receiveEventWebhook);

// Webhook route to receive chpater data
router.post("/chapters/receive", receiveChapterWebhook);

// Webhook route to update member's role
router.post("/updateRole", updateMemberRole);

//New opportunity
router.post("/opportunity", receiveOpp);

// Delete Webhook Chapter
router.post("/deleteChapter", deleteChapter);

// Delete Event Webhook
router.post("/deleteEvent", deleteEvent);

export default router;
