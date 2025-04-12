import express from 'express';
import { receiveEventWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Webhook route to receive event data
router.post('/events/receive', receiveEventWebhook);

export default router;
