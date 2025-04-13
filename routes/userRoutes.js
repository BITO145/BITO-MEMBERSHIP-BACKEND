import express from "express";
import { getChapters, getEvents } from "../controllers/userController.js";

const router = express.Router();

router.get("/events", getEvents);

router.get("/chapters", getChapters);

export default router;
