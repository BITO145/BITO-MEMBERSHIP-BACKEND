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

    // a) Verify signature
    const generated = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // b) Lookup transaction
    const tx = await Transaction.findOne({ orderId: razorpay_order_id });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    // c) Signature mismatch → fail
    if (generated !== razorpay_signature) {
      tx.status = "failed";
      await tx.save();
      await Member.findByIdAndUpdate(tx.user, { paymentStatus: "failed" });
      return res.status(400).json({ error: "Invalid signature" });
    }

    // d) Mark transaction paid
    tx.paymentId = razorpay_payment_id;
    tx.status = "paid";
    await tx.save();

    // e) Upgrade member
    const plan = await membershipPlan.findById(tx.plan);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.durationDays);

    await Member.findByIdAndUpdate(tx.user, {
      membershipLevel: plan.name,
      membershipExpiryDate: expiry,
      paymentStatus: "completed",
    });

    // f) (optional) send confirmation email here…

    res.json({ success: true, validUntil: expiry });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
