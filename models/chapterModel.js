import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema(
  {
    hmrsChapterId: {
      // Unique ID from the HMRS portal
      type: String,
      unique: true,
      required: true,
    },
    chapterName: { type: String, required: true },
    zone: { type: String, required: true },
    description: { type: String },
    chapterLeadName: { type: String, required: true },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
  },
  { timestamps: true }
);

const Chapter = mongoose.model("Chapter", chapterSchema);

export default Chapter;
