import { Router } from "express";
import {
  googleAuth,
  googleAuthUrl,
  signup,
  login,
  logout,
  checkAuth,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();
//google api auth
router.get("/google", googleAuth);

//google url auth
router.get("/google/url", googleAuthUrl);

//signup
router.post("/signup", signup);

//login
router.post("/login", login);

//logout
router.get("/logout", protect, logout);

//check Auth
router.get("/me", protect, checkAuth);

//forgot-pass
router.post("/forgot-password", forgotPassword);

//reset-pass
router.post("/reset-password/:token", resetPassword);

export default router;
