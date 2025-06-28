import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
  },
  verificationToken: {
    type: String,
  },
  password: {
    type: String,
  },
  // membershipLevel: {
  //   type: String,
  // },
  membershipLevel: {
    type: String,
    enum: ["basic", "silver", "gold", "platinum", "diamond"],
    default: "basic",
  },
  chapterMemberships: [
    {
      chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
        required: true,
      },
      role: {
        type: String,
        enum: ["member", "committee"],
        default: "member",
      },
      dateOfJoining: { type: Date, default: Date.now },
    },
  ],
  opportunitiesEnrolled: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity", // Membership portal Opportunity model
    },
  ],
  membershipExpiryDate: {
    type: Date,
  },
  dateOfJoining: {
    type: Date,
    default: Date.now,
  },
  noOfEventsAttended: {
    type: Number,
    default: 0,
  },
  eventsEnrolled: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  connection: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "cancelled"],
    default: "pending",
  },
  image: {
    type: String,
  },
  nationality: {
    type: String,
  },
  businessSector: {
    type: String,
  },
  country: {
    type: String,
  },
  about: {
    type: String,
  },
});

const Member = mongoose.model("Member", memberSchema);

export default Member;
