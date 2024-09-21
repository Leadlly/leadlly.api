import mongoose, { Schema, Document } from 'mongoose';

export interface IPricing extends Document {
  planId: string; 
  amount: number;
  type: 'main' | 'temporary'; 
  currency: string;
  "duration(months)": number;
}

const PricingSchema: Schema = new Schema({
  planId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: {type: String, default: "INR"},
  type: {
    type: String,
    enum: ['main', 'temporary'], 
    required: true,
  },
  "duration(months)": Number
});

export const Pricing = mongoose.model<IPricing>('Pricing', PricingSchema);
