import { postForm, getForms } from "../controllers/formcontroller.js";
import express from "express";

const router = express.Router();

router.post('/', postForm);
router.get('/', getForms);

export default router;