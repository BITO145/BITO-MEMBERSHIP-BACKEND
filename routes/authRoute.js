import { Router } from "express";
import {
  googleAuth,
  googleAuthUrl,
  signup,
  login,
  logout,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/google", googleAuth);
router.get("/google/url", googleAuthUrl);

//signup
router.post("/signup", signup);

//login
router.post("/login", login);

//logout
router.post("/logout", protect, logout);

export default router;
