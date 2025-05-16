import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    hmrsEventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    eventName: {
      type: String,
      required: true,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
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
