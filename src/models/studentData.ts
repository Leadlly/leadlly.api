import mongoose from "mongoose";
import IDataSchema from "../types/IDataSchema";

const dataSchema = new mongoose.Schema<IDataSchema>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  tag: {
    type: String,
    required: true,
  },
  topic: {
    name: {
      type: String,
      required: true,
    },
    plannerFrequency: {type: Number, default: 0},
    level: String,
    overall_efficiency: Number,
    studiedAt: [
      {
        date: Date,
        efficiency: Number,
      },
    ],
  },
  chapter: {
    name: {
      type: String,
      required: true,
    },
    plannerFrequency: {type: Number, default: 0},
    level: String,
    overall_efficiency: Number,
    studiedAt: [
      {
        date: Date,
        efficieny: Number,
      },
    ],
  },
  subject: {
    type: String,
    required: true,
    overall_efficiency: Number,
  },
  standard: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const StudyData = mongoose.model<IDataSchema>("StudyData", dataSchema);
