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
  membershipLevel: {
    type: String,
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
  connection: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
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
