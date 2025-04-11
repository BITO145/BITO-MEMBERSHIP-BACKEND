import { Router } from "express";
import {
  googleAuth,
  googleAuthUrl,
  signup,
  login,
  logout,
  checkAuth,
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
router.post("/logout", protect, logout);

//check Auth
router.get("/me", checkAuth);

export default router;
