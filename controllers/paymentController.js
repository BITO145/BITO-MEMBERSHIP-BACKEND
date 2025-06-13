// src/controllers/paymentController.js
import { razorpay } from "../config/razorpay.js";
import membershipPlan from "../models/membershipPlan.js";
import Transaction from "../models/Transaction.js";
import Member from "../models/memberModel.js";
import crypto from "crypto";

export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { planId } = req.body;

    const plan = await membershipPlan.findById(planId);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const shortUser = userId.toString().slice(-12);
    const receiptId = `rcpt_${shortUser}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: plan.price * 100,
      currency: "INR",
      receipt: receiptId,
      notes: { userId, planId },
    });

    await Transaction.create({
      user: userId,
      plan: planId,
      orderId: order.id,
      amount: plan.price,
      prevLevel: (await Member.findById(userId)).membershipLevel,
      prevExpiry: (await Member.findById(userId)).membershipExpiryDate,
      status: "created",
    });
    await Member.findByIdAndUpdate(userId, { paymentStatus: "pending" });

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

    // a) verify signature
    const generated = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (generated !== razorpay_signature) {
      const tx = await Transaction.findOne({ orderId: razorpay_order_id });
      if (tx) {
        tx.status = "failed";
        tx.failureReason = "Invalid signature";
        tx.failedAt = new Date();
        await tx.save();
        await Member.findByIdAndUpdate(tx.user, { paymentStatus: "failed" });
      }
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const tx = await Transaction.findOne({ orderId: razorpay_order_id });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    if (tx.status === "paid") {
      const member = await Member.findById(tx.user);
      return res.json({
        success: true,
        message: "Payment already processed",
        validUntil: member.membershipExpiryDate,
      });
    }

    // d) verify with Razorpay API
    let paymentDetails;
    try {
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (err) {
      tx.status = "failed";
      tx.failureReason = "Unable to fetch payment from Razorpay";
      tx.failedAt = new Date();
      await tx.save();
      await Member.findByIdAndUpdate(tx.user, { paymentStatus: "failed" });
      return res.status(500).json({ error: "Unable to verify payment" });
    }

    if (paymentDetails.status !== "captured") {
      tx.status = "failed";
      tx.failureReason = `Payment status: ${paymentDetails.status}`;
      tx.failedAt = new Date();
      await tx.save();
      await Member.findByIdAndUpdate(tx.user, { paymentStatus: "failed" });
      return res
        .status(400)
        .json({ error: "Payment not captured", status: paymentDetails.status });
    }

    if (paymentDetails.amount !== tx.amount * 100) {
      tx.status = "failed";
      tx.failureReason = "Amount mismatch";
      tx.failedAt = new Date();
      await tx.save();
      return res.status(400).json({ error: "Payment amount mismatch" });
    }

    // e) process successful payment
    tx.paymentId = razorpay_payment_id;
    tx.status = "paid";
    tx.paidAt = new Date();
    await tx.save();

    const plan = await membershipPlan.findById(tx.plan);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.durationDays);

    await Member.findByIdAndUpdate(tx.user, {
      membershipLevel: plan.name,
      membershipExpiryDate: expiry,
      paymentStatus: "completed",
    });

    res.json({ success: true, validUntil: expiry });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * 3) Cancel (and refund) a payment
 */
export const cancelPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    const tx = await Transaction.findOne({ orderId, user: userId });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    // if already captured on Razorpay, refund it
    if (tx.paymentId) {
      try {
        // console.log("entering try block in cnacel payment");
        await razorpay.payments.refund(tx.paymentId, { speed: "normal" });
        tx.status = "refunded";
        tx.refundedAt = new Date();
        await tx.save();
        await Member.findByIdAndUpdate(tx.user, {
          membershipLevel: tx.prevLevel,
          membershipExpiryDate: tx.prevExpiry,
          paymentStatus: "cancelled",
        });
        // console.log("payment refunded");
      } catch (refundErr) {
        console.error("Refund error:", refundErr);
        // continue to mark cancelled anyway
      }
    }

    if (tx.status !== "paid") {
      console.log(tx.status);
      tx.status = "cancelled";
      console.log(tx.status, "after");
      tx.cancelledAt = new Date();
      await tx.save();
      await Member.findByIdAndUpdate(userId, { paymentStatus: "cancelled" });
    }

    res.json({
      success: true,
      message: "Payment cancelled (and refunded if captured)",
    });
  } catch (err) {
    console.error("cancelPayment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * 4) Webhook handler for Razorpay
 */
export const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    if (secret) {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");
      if (signature !== expected) {
        return res.status(400).json({ error: "Invalid webhook signature" });
      }
    }

    const evt = req.body.event;
    const paymentEntity = req.body.payload.payment?.entity;
    const orderEntity = req.body.payload.order?.entity;
    const refundEntity = req.body.payload.refund?.entity;
    console.log("thsi is refund entity", refundEntity);

    switch (evt) {
      case "payment.captured":
        await handlePaymentCaptured(paymentEntity);
        break;
      case "payment.failed":
        await handlePaymentFailed(paymentEntity);
        break;

      case "refund.created":
      case "refund.processed":
        if (refundEntity) {
          await handlePaymentRefunded(refundEntity);
        }
      case "order.paid":
        await handleOrderPaid(orderEntity);
        break;
      default:
        console.log(`Unhandled webhook event: ${evt}`);
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

async function handlePaymentCaptured(payment) {
  const tx = await Transaction.findOne({ orderId: payment.order_id });
  if (!tx || tx.status === "paid") return;

  tx.paymentId = payment.id;
  tx.status = "paid";
  tx.paidAt = new Date();
  await tx.save();

  const plan = await membershipPlan.findById(tx.plan);
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + plan.durationDays);

  await Member.findByIdAndUpdate(tx.user, {
    membershipLevel: plan.name,
    membershipExpiryDate: expiry,
    paymentStatus: "completed",
  });
}

async function handlePaymentFailed(payment) {
  const tx = await Transaction.findOne({ orderId: payment.order_id });
  if (!tx) return;

  tx.status = "failed";
  tx.failureReason = payment.error_description || "Payment failed";
  tx.failedAt = new Date();
  await tx.save();

  await Member.findByIdAndUpdate(tx.user, { paymentStatus: "failed" });
}

async function handlePaymentRefunded(refund) {
  console.log("inside payment refunded controller");
  // refund.payment_id links back to the original payment
  const tx = await Transaction.findOne({ paymentId: refund.payment_id });
  if (!tx || tx.status === "refunded") return;

  tx.status = "refunded";
  tx.refundedAt = new Date(refund.created_at * 1000);
  await tx.save();

  // roll back the member
  await Member.findByIdAndUpdate(tx.user, {
    membershipLevel: tx.prevLevel,
    membershipExpiryDate: tx.prevExpiry,
    paymentStatus: "cancelled",
  });
}

async function handleOrderPaid(order) {
  if (!order) {
    console.warn("handleOrderPaid called with no order payload");
    return;
  }
  console.log(`Webhook Order Paid: ${order.id}`);
  // …etc…
}
