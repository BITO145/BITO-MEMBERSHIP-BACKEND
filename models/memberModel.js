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
  role: {
    type: String,
    default: "member",
  },
  chapterId: {
    type: String,
  },
  chaptersEnrolled: {
    type: [String],
    default: [],
  },
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
});

const Member = mongoose.model("Member", memberSchema);

export default Member;
