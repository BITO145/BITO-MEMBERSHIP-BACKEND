// models/Opportunity.js (Membership Side)

import mongoose from "mongoose";

const opportunitySchema = new mongoose.Schema(
  {
    // Reference to admin HRMS opportunity
    hrmsOppId: {
      type: String,
      required: true,
      unique: true,
    },
    oppName: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    membershipRequired: {
      type: Boolean,
      default: false,
    },

    // Members who showed interest (linked to Member model)
    interestedMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Opportunity", opportunitySchema);
