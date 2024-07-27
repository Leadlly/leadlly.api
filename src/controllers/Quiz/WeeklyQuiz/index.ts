import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middlewares/error";
import { questions_db } from "../../../db/db";
import IUser from "../../../types/IUser";
import moment from "moment-timezone";
import Planner from "../../../models/plannerModel";
import { Collection } from "mongodb";
import SolvedQuestions from "../../../models/solvedQuestions";
import { Quiz } from "../../../models/quizModel";

export const createWeeklyQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user: IUser = req.user;

    const activationDate =
      user.freeTrial.dateOfActivation || user.subscription.dateOfActivation;
    if (!activationDate) {
      return next(new CustomError("Not subscribed", 400));
    }

    const timezone = "Asia/Kolkata";
    const currentMoment = moment.tz(timezone);

    // Calculate the start and end of next week
    const startDate = moment(currentMoment).startOf("isoWeek").toDate();
    const endDate = moment(startDate).endOf("isoWeek").toDate();

    const currentWeekPlanner = await Planner.findOne({
      student: user._id,
      startDate,
      endDate,
    });

    if (!currentWeekPlanner) {
      return new CustomError("Planner for current week does not exist!");
    }

    // Get current weeks Back Revision Topics
    const currentWeekBackRevisionTopics = currentWeekPlanner.days
      .map((day) => day.backRevisionTopics)
      .flatMap((item) => item);

    // Get current weeks Continuous Revision Topics
    const currentWeekContinuousRevisionTopics = currentWeekPlanner.days
      .map((day) => day.continuousRevisionTopics)
      .flatMap((item) => item);

    const weeklyTopics = [
      ...currentWeekContinuousRevisionTopics,
      ...currentWeekBackRevisionTopics,
    ];

    const questions: Collection = questions_db.collection("questionbanks");
    const results: { [key: string]: any[] } = {};
    const categories = [
      "jeemains_easy",
      "neet",
      "boards",
      "jeemains",
      "jeeadvance",
    ];

    for (let topicData of weeklyTopics) {
      const topic = topicData.topic.name;
      results[topic] = [];
      let remainingQuestions = 2;

      for (let category of categories) {
        if (remainingQuestions > 0) {
          const query = { topics: topic, level: category };
          const topicQuestions = await questions
            .aggregate([
              { $match: query },
              { $sample: { size: remainingQuestions } },
            ])
            .toArray();

          topicQuestions.map(async (topicData) => {
            const solvedQuestions = await SolvedQuestions.findOne({
              student: user._id,
              "question.question": topicData.question,
            });

            if (!solvedQuestions) {
              results[topic].push(topicData);
              remainingQuestions -= topicQuestions.length;
            }
          });
        } else {
          break;
        }
      }
    }

    const weeklyQuiz = await Quiz.create({
      user: user._id,
      questions: results,
      quizType: "weekly",
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Weekly quiz created successfully!",
      weeklyQuiz,
    });
  } catch (error: any) {
    next(new CustomError(error.message));
  }
};
