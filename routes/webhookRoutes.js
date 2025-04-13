import express from "express";
import {
  receiveEventWebhook,
  receiveChapterWebhook,
} from "../controllers/webhookController.js";

const router = express.Router();

// Webhook route to receive event data
router.post("/events/receive", receiveEventWebhook);

// Webhook route to receive chpater data
router.post("/chapters/receive", receiveChapterWebhook);

export default router;
