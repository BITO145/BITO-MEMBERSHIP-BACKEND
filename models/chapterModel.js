import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema({
  chapterName: { type: String, required: true },
  zone: { type: String, required: true },
  description: { type: String },
  chapterLeadName: { type: String, required: true },
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
}, { timestamps: true });

const Chapter = mongoose.model("Chapter", chapterSchema);

export default Chapter;
