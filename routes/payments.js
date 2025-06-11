import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createOrder,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

// 1) Create Razorpay order
router.post("/membership/create-order", protect, createOrder);

// 2) Verify payment & upgrade member
router.post("/membership/verify", protect, verifyPayment);

export default router;
