import cron from "node-cron";
import IUser from "../../types/IUser";
import User from "../../models/userModel";
import { createPlanner } from ".";
import { Request, Response, NextFunction } from "express";

const maxRetries = 3;
const retryDelay = 180000; // 3-minute delay between retries

const mockResponse = () => {
  const res = {} as Response;
  res.status = (code: number) => {
    console.log(`Status: ${code}`);
    return res;
  };
  res.json = (data: any) => {
    console.log("JSON Response:", data);
    return res;
  };
  return res;
};

const mockNext: NextFunction = (error?: any) => {
  if (error) {
    console.error("Error:", error);
  }
};

const runJobWithRetries = async (jobFunction: Function, retries: number, nextWeek: boolean) => {
  try {
    const users: IUser[] = await User.find({
      $or: [
        { "subscription.status": "active", "subscription.dateOfActivation": { $exists: true } },
        { "freeTrial.active": true }
      ]
    });

    for (const user of users) {
      const req = { user, body: { nextWeek } } as Request;
      const res = mockResponse();
      await jobFunction(req, res, mockNext);
    }
    console.log(`Scheduled ${jobFunction.name} job completed successfully.`);
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `Error running scheduled ${jobFunction.name}, retrying... (${retries} retries left)`,
        error,
      );
      setTimeout(() => runJobWithRetries(jobFunction, retries - 1, nextWeek), retryDelay);
    } else {
      console.error(
        `Error running scheduled ${jobFunction.name} after multiple retries:`,
        error,
      );
    }
  }
};


// Schedule the createPlanner task to run every Friday at 12:40 AM IST (7:10 PM UTC, previous day)
cron.schedule("10 19 * * 4", () => {
  runJobWithRetries(createPlanner, maxRetries, true);
});

// Schedule the createPlanner task to run every Friday at 12:42 AM IST (7:12 PM UTC, previous day)
cron.schedule("12 19 * * 4", () => {
  runJobWithRetries(createPlanner, maxRetries, true);
});


