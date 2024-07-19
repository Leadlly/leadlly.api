import { Document, ObjectId } from "mongoose";

export interface ISubject {
  name: string;
  overall_efficiency?: number;
  overall_progress?: number;
  total_questions_solved: { 
    number?: number;
    percentage?: number;
  };
}

interface IAcademic {
  standard: number;
  competitiveExam?: string | null;
  subjects: ISubject[];
  schedule?: string | null;
  coachingMode?: string | null;
  coachingName?: string | null;
  coachingAddress?: string | null;
  schoolOrCollegeName?: string | null;
  schoolOrCollegeAddress?: string | null;
}

interface IUser extends Document {
  firstname: string;
  lastname?: string;
  email: string;
  phone: {
    personal?: number;
    other?: number;
  };
  password: string;
  salt: string;
  avatar?: {
    public_id?: string;
    url?: string;
  };
  planner: boolean;
  parent: {
    name?: string;
    phone?: string;
  };
  mentor: {
    id?: ObjectId;
  };
  address: {
    country?: string;
    addressLine?: string;
    pincode?: number;
  };
  academic: IAcademic;
  about: {
    dateOfBirth?: string;
    gender: string;
  };
  role?: string;
  details?: {
    level?: { number: number};
    points?: { number: number};
    streak?: { number: number};
    mood?: Array<{
      day: string;
      emoji: string;
    }>;
    report?: {
      dailyReport?: {
        session: number;
        quiz: number;
        overall: number;
      };
      weeklyReport?: {
        session: number;
        quiz: number;
        overall: number;
      };
      monthlyReport?: {
        session: number;
        quiz: number;
        overall: number;
      };
      overallReport?: {
        session: number;
        quiz: number;
        overall: number;
      };
    };
  };
  badges?: Array<{
    name: string;
    url: string;
  }>;
  points?: number;
  subscription: {
    type?: string;
    id?: string;
    status?: string;
    dateOfActivation?: Date;
  };
  freeTrial: {
    availed?: boolean;
    active?: boolean;
    dateOfActivation?: Date;
    dateOfDeactivation?: Date;
  };
  refund: {
    type?: string;
    subscriptionType?: string;
    status?: string;
    amount?: string;
  };
  resetPasswordToken?: string | null;
  resetTokenExpiry?: Date | null;
  createdAt?: Date; 
  updatedAt?: Date; 
  comparePassword(candidatePassword: string): Promise<boolean>;
  getToken(): Promise<string>;
}

export default IUser;
