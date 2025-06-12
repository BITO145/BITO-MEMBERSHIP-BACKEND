import { razorpay } from "../config/razorpay.js";
import membershipPlan from "../models/membershipPlan.js";
import Transaction from "../models/Transaction.js";
import Member from "../models/memberModel.js";
import crypto from "crypto";

/**
 * 1) Create a Razorpay order and mark the member paymentStatus="pending"
 */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { planId } = req.body;

    // 1. Load the plan
    const plan = await membershipPlan.findById(planId);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    // 2) Build a short receipt ID under 40 chars
    const shortUser = userId.slice(-12); // last 12 chars of your ObjectId
    const receiptId = `rcpt_${shortUser}_${Date.now()}`;

    // 2. Create the Razorpay order
    const order = await razorpay.orders.create({
      amount: plan.price * 100, // ₹ → paise
      currency: "INR",
      receipt: receiptId,
      notes: { userId, planId },
    });

    // 3. Record the transaction & mark member pending
    await Transaction.create({
      user: userId,
      plan: planId,
      orderId: order.id,
      amount: plan.price,
      status: "created", // Initial status
    });
    await Member.findByIdAndUpdate(userId, { paymentStatus: "pending" });

    // 4. Return order info to client
    res.json({ orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * 2) Verify Razorpay payment signature, update tx + member
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // a) Verify signature first
    const generated = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // b) Lookup transaction
    const tx = await Transaction.findOne({ orderId: razorpay_order_id });
    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // c) Check if already processed (prevent duplicate processing)
    if (tx.status === "paid") {
      const member = await Member.findById(tx.user);
      return res.json({
        success: true,
        message: "Payment already processed",
        validUntil: member.membershipExpiryDate,
      });
    }

    // d) CRITICAL: Verify payment status with Razorpay API
    try {
      const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

      // Check if payment is actually captured
      if (paymentDetails.status !== "captured") {
        // Payment not captured - mark as failed
        tx.status = "failed";
        tx.failureReason = `Payment status: ${paymentDetails.status}`;
        await tx.save();

        await Member.findByIdAndUpdate(tx.user, {
          paymentStatus: "failed",
        });

        return res.status(400).json({
          error: "Payment not captured",
          status: paymentDetails.status,
        });
      }

      // Verify amount matches
      if (paymentDetails.amount !== tx.amount * 100) {
        tx.status = "failed";
        tx.failureReason = "Amount mismatch";
        await tx.save();

        return res.status(400).json({ error: "Payment amount mismatch" });
      }
    } catch (razorpayError) {
      console.error("Error fetching payment from Razorpay:", razorpayError);

      // If we can't verify with Razorpay, mark as failed
      tx.status = "failed";
      tx.failureReason = "Unable to verify payment with Razorpay";
      await tx.save();

      await Member.findByIdAndUpdate(tx.user, {
        paymentStatus: "failed",
      });

      return res.status(500).json({
        error: "Unable to verify payment status",
      });
    }

    // e) Payment is verified and captured - process it
    tx.paymentId = razorpay_payment_id;
    tx.status = "paid";
    tx.paidAt = new Date();
    await tx.save();

    // f) Upgrade member
    const plan = await membershipPlan.findById(tx.plan);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.durationDays);

    await Member.findByIdAndUpdate(tx.user, {
      membershipLevel: plan.name,
      membershipExpiryDate: expiry,
      paymentStatus: "completed",
    });

    console.log(`Payment verified and membership updated for user: ${tx.user}`);

    res.json({ success: true, validUntil: expiry });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * 3) Handle payment cancellation/failure
 */
export const cancelPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    // Find transaction
    const tx = await Transaction.findOne({
      orderId,
      user: userId,
    });

    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    // If it's already paid & captured on Razorpay's side, refund it
    if (tx.paymentId) {
      try {
        await razorpay.payments.refund(tx.paymentId, { speed: "normal" });
        console.log(`Refund issued for payment ${tx.paymentId}`);
      } catch (refundErr) {
        console.error("Error issuing refund:", refundErr);
        // you can choose to continue or return an error here
      }
    }

    // Only cancel if not already paid
    if (tx.status !== "paid") {
      tx.status = "cancelled";
      tx.cancelledAt = new Date();
      await tx.save();

      await Member.findByIdAndUpdate(userId, {
        paymentStatus: "cancelled",
      });
    }

    res.json({ success: true, message: "Payment cancelled" });
  } catch (err) {
    console.error("cancelPayment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * 4) Webhook handler for Razorpay events (RECOMMENDED)
 */
export const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const webhookSignature = req.headers["x-razorpay-signature"];
    const webhookBody = JSON.stringify(req.body);

    // Verify webhook signature
    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(webhookBody)
        .digest("hex");

      if (webhookSignature !== expectedSignature) {
        return res.status(400).json({ error: "Invalid webhook signature" });
      }
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload.payment?.entity;
    const orderEntity = req.body.payload.order?.entity;

    console.log(`Webhook received: ${event}`);

    switch (event) {
      case "payment.captured":
        await handlePaymentCaptured(paymentEntity);
        break;

      case "payment.failed":
        await handlePaymentFailed(paymentEntity);
        break;

      case "order.paid":
        await handleOrderPaid(orderEntity);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

// Helper functions for webhook handling
const handlePaymentCaptured = async (payment) => {
  try {
    const tx = await Transaction.findOne({ orderId: payment.order_id });
    if (!tx || tx.status === "paid") return;

    // Update transaction
    tx.paymentId = payment.id;
    tx.status = "paid";
    tx.paidAt = new Date();
    await tx.save();

    // Update membership
    const plan = await membershipPlan.findById(tx.plan);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.durationDays);

    await Member.findByIdAndUpdate(tx.user, {
      membershipLevel: plan.name,
      membershipExpiryDate: expiry,
      paymentStatus: "completed",
    });

    console.log(`Webhook: Payment captured for user ${tx.user}`);
  } catch (error) {
    console.error("Error handling payment captured webhook:", error);
  }
};

const handlePaymentFailed = async (payment) => {
  try {
    const tx = await Transaction.findOne({ orderId: payment.order_id });
    if (!tx) return;

    tx.status = "failed";
    tx.failureReason = payment.error_description || "Payment failed";
    await tx.save();

    await Member.findByIdAndUpdate(tx.user, {
      paymentStatus: "failed",
    });

    console.log(`Webhook: Payment failed for order ${payment.order_id}`);
  } catch (error) {
    console.error("Error handling payment failed webhook:", error);
  }
};

const handleOrderPaid = async (order) => {
  // Additional handling if needed
  console.log(`Webhook: Order paid ${order.id}`);
};
