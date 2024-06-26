"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWeeklyPlanner = void 0;
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const plannerModel_1 = __importDefault(require("../../../models/plannerModel"));
const studentData_1 = require("../../../models/studentData");
const getDailyTopics_1 = require("../DailyTopics/getDailyTopics");
const getDailyQuestions_1 = require("../DailyQuestions/getDailyQuestions");
const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];
const timezone = "Asia/Kolkata";
const generateWeeklyPlanner = async (user, backRevisionTopics) => {
    const today = (0, moment_timezone_1.default)().tz(timezone).startOf("day").toDate();
    const activationDate = (0, moment_timezone_1.default)(user.subscription.dateOfActivation).tz(timezone).startOf("day");
    // Determine the start date of the planner
    const startDate = activationDate.isSameOrAfter((0, moment_timezone_1.default)().startOf("isoWeek"))
        ? activationDate.toDate()
        : (0, moment_timezone_1.default)().tz(timezone).startOf("isoWeek").toDate();
    const endDate = (0, moment_timezone_1.default)(startDate).endOf("isoWeek").toDate();
    const yesterday = (0, moment_timezone_1.default)().tz(timezone).subtract(1, 'days').startOf("day").toDate();
    const continuousRevisionTopics = (await studentData_1.StudyData.find({
        user: user._id,
        tag: "continuous_revision",
        createdAt: { $gte: yesterday },
    }).exec());
    let dailyQuestions;
    const days = await Promise.all(daysOfWeek.map(async (day, index) => {
        const date = (0, moment_timezone_1.default)(startDate).add(index, "days").tz(timezone).toDate();
        const { dailyContinuousTopics, dailyBackTopics } = (0, getDailyTopics_1.getDailyTopics)(continuousRevisionTopics, backRevisionTopics, user);
        const dailyTopics = [...dailyContinuousTopics, ...dailyBackTopics];
        dailyTopics.forEach(data => {
            if (!data.topic.studiedAt) {
                data.topic.studiedAt = [];
            }
            data.topic.studiedAt.push({ date, efficiency: 0 }); // Add date with null efficiency for now
        });
        dailyQuestions = await (0, getDailyQuestions_1.getDailyQuestions)(day, date, dailyTopics);
        return {
            day,
            date,
            continuousRevisionTopics: dailyContinuousTopics,
            backRevisionTopics: dailyBackTopics,
            questions: dailyQuestions
        };
    }));
    const generatedPlanner = new plannerModel_1.default({
        student: user._id,
        startDate,
        endDate,
        days,
    });
    const planner = await plannerModel_1.default.create(generatedPlanner);
    continuousRevisionTopics.forEach(data => data.tag = "active_continuous_revision");
    await Promise.all(continuousRevisionTopics.map(data => data.save()));
    console.log(planner);
    return planner;
};
exports.generateWeeklyPlanner = generateWeeklyPlanner;
