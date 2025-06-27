import express from "express";
// import { protect } from "../middleware/auth.js";
import {
  getMembers,
  memberProfile,
  membershipStats,
  membershipTransactions,
} from "../controllers/adminAnalyticsController.js";
// import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1) Stats summary
router.get("/membership-stats", membershipStats);

// 2) Transaction list
router.get("/membership-transactions", membershipTransactions);

// 3) Members list
router.get("/membersList", getMembers);

// 4) Members list
router.get("/membersList", getMembers);

//5)  member by id
router.get("/members/:id", memberProfile);

export default router;
