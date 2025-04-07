import { Router } from "express";
import { googleAuth } from "../controllers/authController.js";

const router = Router();

router.get("/google", googleAuth);

export default router;
