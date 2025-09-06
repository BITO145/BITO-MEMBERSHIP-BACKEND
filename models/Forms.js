import mongoose from "mongoose";

const formSchema = new mongoose.Schema(
  {
    formType:{
        type: String,
        enum: ['industrial', 'startup', 'healthcare', 'green', 'technology'],
        required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    additionalInfo: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Form = mongoose.model("Form", formSchema);
