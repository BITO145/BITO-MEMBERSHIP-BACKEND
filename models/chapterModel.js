import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema(
  {
    hmrsChapterId: {
      type: String,
      unique: true,
      required: true,
    },
    chapterName: { type: String, required: true },
    zone: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    chapterLeadName: { type: String, required: true },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    membershipRequired: { type: Boolean, default: false },
    members: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Member",
          required: true,
        },
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

const Chapter = mongoose.model("Chapter", chapterSchema);

export default Chapter;
