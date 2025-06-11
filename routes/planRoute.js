import { Router } from "express";
import { addPlan, listPlans } from "../controllers/planController.js";
const router = Router();

// Create a new plan
router.post("/membership", addPlan);

// List all plans
router.get("/get-plan", listPlans);

export default router;
