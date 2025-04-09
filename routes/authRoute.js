import { Router } from "express";
import { googleAuth, googleAuthUrl } from "../controllers/authController.js";

const router = Router();

router.get("/google", googleAuth);
router.get("/google/url", googleAuthUrl);

export default router;
