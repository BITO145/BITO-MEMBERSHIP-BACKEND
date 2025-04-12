import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
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
    description: {
      type: String,
    },
    membershipRequired: {
      type: String,
      required: true,
      enum: ["free", "memba", "b", "c", "d"], // you can adjust as per your business logic
      default: "free",
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
