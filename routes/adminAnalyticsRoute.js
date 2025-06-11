import express from "express";
// import { protect } from "../middleware/auth.js";
import {
  membershipStats,
  membershipTransactions,
} from "../controllers/adminAnalyticsController.js";
// import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1) Stats summary
router.get("/membership-stats", membershipStats);

// 2) Transaction list
router.get("/membership-transactions", membershipTransactions);

export default router;
