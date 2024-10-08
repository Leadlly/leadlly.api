import mongoose from "mongoose";
import { IDay, IPlanner } from "../types/IPlanner";

const daySchema = new mongoose.Schema<IDay>({
  date: {
    type: Date,
    required: true,
  },
  day: {
    type: String,
    required: true,
  },
  continuousRevisionTopics: Array, 
  backRevisionTopics: Array,
  chapters: Array,
  completedTopics: [],
  incompletedTopics: [],
  questions: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const plannerSchema = new mongoose.Schema<IPlanner>({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Student",
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  days: [daySchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Planner = mongoose.model<IPlanner>("Planner", plannerSchema);

export default Planner;
