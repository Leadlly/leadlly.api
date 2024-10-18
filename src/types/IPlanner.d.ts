import mongoose, { Document, ObjectId } from "mongoose";

interface PlannerChapter {
  id?: mongoose.Schema.Types.ObjectId,
  name: string,
  quizId?: mongoose.Schema.Types.ObjectId,
}
interface IDay {
  date: Date;
  day: string;
  continuousRevisionTopics: any[];
  continuousRevisionSubTopics: any[];
  backRevisionTopics: any[];
  chapters: PlannerChapter[]
  completedTopics: any[],
  incompletedTopics: any[],
  questions: { [key: string]: any };
}

interface IPlanner extends Document {
  student: ObjectId;
  startDate: Date;
  endDate: Date;
  days: IDay[];
  createdAt: Date;
}
