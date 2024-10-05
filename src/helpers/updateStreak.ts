import cron from 'node-cron';
import IUser from "../types/IUser";
import User from '../models/userModel';

// Function to update the user's streak
export const updateStreak = async (user: IUser) => {
  try {
    console.log("Checking streak update...");

    // Initialize streak if it doesn't exist
    if (!user?.details?.streak?.updatedAt) {
      user.details.streak = {
        number: 1,
        updatedAt: new Date(),
      };
      await user.save();
      console.log("Streak initialized:", user.details.streak);
      return;
    }

    // Update the streak for today
    user.details.streak.number += 1; 
    user.details.streak.updatedAt = new Date(); 
    await user.save();
    console.log("Streak updated:", user.details.streak);
  } catch (error: any) {
    console.error("Error updating streak:", error.message);
    throw new Error("Failed to update user streak.");
  }
};

// Function to reset streaks for all users if they have missed a day
const resetStreaksDaily = async () => {
  try {
    const users = await User.find(); 
    const currentDate = new Date().setHours(0, 0, 0, 0); 

    for (const user of users) {
      if (user.details?.streak?.updatedAt) {
        const streakUpdatedAt = new Date(user.details.streak.updatedAt).setHours(0, 0, 0, 0);
        const differenceInTime = currentDate - streakUpdatedAt;
        const differenceInDays = differenceInTime / (1000 * 3600 * 24);

        if (differenceInDays > 1) {
          // If more than one day has passed since the last update, reset the streak
          user.details.streak.number = 0;
          user.details.streak.updatedAt = new Date();
          await user.save();
          console.log(`Streak reset for user ${user._id}:`, user.details.streak);
        }
      }
    }
  } catch (error: any) {
    console.error("Error resetting streaks:", error.message);
  }
};

cron.schedule('12 0 * * *', resetStreaksDaily );
