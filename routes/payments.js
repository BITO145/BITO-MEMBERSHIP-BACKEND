import express from "express";
import {
  createOrder,
  verifyPayment,
  cancelPayment,
  handleWebhook,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create order (requires authentication)
router.post("/membership/create-order", protect, createOrder);

// Verify payment (requires authentication)
router.post("/membership/verify", protect, verifyPayment);

// Cancel payment (requires authentication)
router.post("/membership/cancel-payment", protect, cancelPayment);

// Webhook endpoint (no authentication needed)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

export default router;
