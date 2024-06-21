import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import IUser from "../types/IUser";
import crypto from "crypto";

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please enter your name"],
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    personal: {
      type: Number,
      unique: true,
    },
    other: Number,
  },
  parentName: String,
  parentPhone: Number,
  country: String,
  address: String,
  pincode: Number,
  academic: {
    examName: String,
    schedule: String,
    schoolOrCollegeName: String,
    coachingMode: String,
    coachingName: String,
  },
  password: {
    type: String,
    select: false,
  },
  avatar: {
    public_id: {
      type: String,
      default: "",
    },
    url: {
      type: String,
      default: "",
    },
  },
  role: {
    type: String,
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
details: {
    level: Number,
    points: Number,
    streak: Number,
    mood: [
      {
        day: String,
        emoji: String,
      },
    ],
  },
  badges: [
    {
      name: {
        type: String,
        default: "Beginner",
      },
      url: {
        type: String,
        default: "default_url",
      },
    },
  ],
  subscription: {
    type: String,
    id: String,
    status: String,
  },
  refund: {
    type: String,
    subscriptionType: String,
    status: String,
    amount: Number,
  },
  quiz: {
    daily: [],
    weekly: [],
    monthly: [],
    QOTD: [], // question of the day
    others: [],
  },
  resetPasswordToken: String,
  resetTokenExpiry: String,
});

// Pre-save hook for email validation
userSchema.pre("save", function (next) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.email)) {
    return next(new Error("Please enter a valid email address"));
  }
  next();
});

// Pre-save hook for password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  if (!this.password) return;
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Error comparing password.");
  }
};

userSchema.methods.getToken = async function (): Promise<string> {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetTokenExpiry = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model<IUser>("User", userSchema);

export default User;
