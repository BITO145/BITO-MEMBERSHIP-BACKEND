import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    prevLevel: {
      type: String,
      enum: ["basic", "silver", "gold", "platinum", "diamond"],
      required: true,
    },
    prevExpiry: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed", "cancelled", "refunded"],
      default: "created",
    },
    failureReason: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      // ← NEW
      type: Date,
      default: null,
    },
    refundedAt: {
      // ← NEW
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Transaction", transactionSchema);
