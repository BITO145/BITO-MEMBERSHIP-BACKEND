import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["basic", "silver", "gold", "platinum", "diamond"],
    },
    price: {
      type: Number,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
    },
    benefits: {
      type: [String], // array of bullet point strings
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("MembershipPlan", planSchema);
