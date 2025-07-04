import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    hmrsEventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    eventName: {
      type: String,
      required: true,
    },
    slots: {
      type: Number,
      required: true,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    eventStartTime: {
      type: Date,
      required: true,
    },
    eventEndTime: {
      type: Date,
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
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
    chapter: {
      chapterId: { type: String, required: true },
      chapterName: { type: String, required: true },
    },
    members: [
      {
        memberId: { type: String, required: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // or "SuperAdmin", depending on your structure
      //   required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Event = mongoose.model("Event", eventSchema);
export default Event;
