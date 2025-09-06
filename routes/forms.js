import { postForm, getForms, deleteForm } from "../controllers/formcontroller.js";
import express from "express";

const router = express.Router();

router.post('/', postForm);
router.get('/', getForms);
router.delete('/:id', deleteForm);

export default router;