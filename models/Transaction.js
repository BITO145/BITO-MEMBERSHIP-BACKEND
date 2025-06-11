// src/models/Transaction.js
import mongoose from "mongoose";
const txSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MembershipPlan",
    required: true,
  },
  orderId: { type: String, required: true }, // Razorpay order ID
  paymentId: { type: String }, // Razorpay payment ID
  amount: { type: Number, required: true }, // ₹
  currency: { type: String, default: "INR" },
  status: {
    type: String,
    enum: ["created", "paid", "failed"],
    default: "created",
  },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.model("Transaction", txSchema);
