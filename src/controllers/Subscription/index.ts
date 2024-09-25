import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middlewares/error";
import razorpay from "../../services/payment/Razorpay";
import User from "../../models/userModel";
import { subQueue } from "../../services/bullmq/producer";
import crypto from "crypto";
import Payment from "../../models/paymentModel";
import { Options, sendMail } from "../../utils/sendMail";
import { IPricing, Pricing } from "../../models/pricingModel";
import { Coupon } from "../../models/couponModel";
import { Order } from "../../models/order_created";

export const buySubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new CustomError("User not found", 404));
    }

    const planId = req.query.planId as string;
    const pricing = await Pricing.findOne({ planId }) as IPricing;

    if (!pricing) {
      return next(new CustomError("Invalid plan selected", 400));
    }

    // Check if the user has an active subscription
    let amount = pricing.amount * 100; // Convert amount to paise for Razorpay
    if (user.subscription.status === 'active' && user.subscription.planId) {
      // Fetch current active plan pricing
      const currentActivePlan = await Pricing.findOne({ planId: user.subscription.planId });
      if (!currentActivePlan) {
        return next(new CustomError("Current subscription plan not found", 400));
      }

      // Calculate the remaining value of the current subscription
      const currentDate = new Date();
      const deactivationDate = user.subscription.dateOfDeactivation!;
      const timeRemaining = (deactivationDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24); // Remaining days

      // Get price per day of the current plan
      const pricePerDayCurrent = currentActivePlan.amount / (currentActivePlan["duration(months)"] * 30); // Assumes 30 days in a month
      // Remaining value of the current subscription
      const remainingValue = pricePerDayCurrent * timeRemaining;

      // Calculate the difference amount
      const differenceAmount = pricing.amount - remainingValue;
      amount = Math.round(differenceAmount) * 100; // Convert to paise and ensure no negative values
    }

    // Handle coupon discount if available
    const couponCode = req.query.coupon as string;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });
      if (!coupon) {
        return next(new CustomError("Invalid coupon code", 400));
      }

      if (coupon.expiryDate && coupon.expiryDate < new Date()) {
        return next(new CustomError("Coupon has expired", 400));
      }

      if (coupon.usageLimit && coupon.usageLimit <= 0) {
        return next(new CustomError("Coupon usage limit reached", 400));
      }

      if (coupon.discountType === "percentage") {
        amount -= (amount * coupon.discountValue) / 100;
      } else {
        amount -= coupon.discountValue * 100; // Convert flat discount to paise
      }

      // Update coupon usage limit
      if (coupon.usageLimit) {
        coupon.usageLimit -= 1;
        await coupon.save();
      }
    }

    // Create Razorpay order
    const subscription = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: crypto.randomBytes(16).toString("hex"),
      payment_capture: true,
    });

    const existingOrder = await Order.findOne({ user: user._id });
    if (existingOrder) {
      existingOrder.order_id = subscription.id;
      existingOrder.planId = planId;
      existingOrder.duration = pricing["duration(months)"];
      existingOrder.coupon = couponCode;
      existingOrder.categogy = pricing.category
      await existingOrder.save();
    } else {
      await Order.create({
        user: user._id,
        order_id: subscription.id,
        planId,
        duration: pricing["duration(months)"],
        coupon: couponCode,
        categogy: pricing.category
      });
    }

 
    if(user.subscription.status === "active") {
      user.subscription.status = "active"
    } else {

      user.subscription.status = "pending";
    }
    await user.save();

    res.status(200).json({
      success: true,
      subscription,
    });
  } catch (error: any) {
    console.log(error);
    next(new CustomError(error.message, 500));
  }
};

export const verifySubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    const { appRedirectURI } = req.query;
    
    const user = await User.findById(req.user._id);
    if (!user) return next(new CustomError("User not found", 404));

    const order = await Order.findOne({ user: user._id });
    if (!order) return next(new CustomError("Order not found", 404));
    

    const order_id = order?.order_id;

    const secret = process.env.RAZORPAY_API_SECRET;
    if (!secret)
      return next(new CustomError("Razorpay secret is not defined", 400));

    // Verify Razorpay signature
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(order_id + "|" + razorpay_payment_id, "utf-8")
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return appRedirectURI
        ? res.redirect(`${appRedirectURI}?payment=failed`)
        : res.redirect(`${process.env.FRONTEND_URL}/paymentfailed`);
    }

    // Save payment info
    await Payment.create({
      razorpay_payment_id,
      razorpay_subscription_id: razorpay_order_id,
      razorpay_signature,
      user: user._id,
      planId: user.subscription?.planId,
      coupon: user.subscription?.coupon,
    });

    const pricing = await Pricing.findOne({ planId: order?.planId }) as IPricing;

    if (!pricing) {
      return next(new CustomError("Invalid plan duration selected", 400));
    }

    const currentDeactivationDate = user.subscription.dateOfDeactivation;
    const durationInMonths = pricing["duration(months)"]

    if (user.subscription.status === "active") {
      // Handle subscription extension on upgrade
      user.subscription.upgradation = {
        previousPlanId: user.subscription.planId,
        previousDuration: user.subscription.duration,
        dateOfUpgradation: new Date(),
        addedDuration: durationInMonths, 
      };

      // Update the subscription duration
      user.category = order.categogy
      user.subscription.duration += durationInMonths;
      user.subscription.id = order?.order_id;
      user.subscription.planId = order?.planId;
      user.subscription.coupon = order?.coupon;

        const addedDuration = durationInMonths || 0;
        if (currentDeactivationDate) {
          const newDeactivationDate = new Date(currentDeactivationDate);
          newDeactivationDate.setMonth(newDeactivationDate.getMonth() + addedDuration);
          user.subscription.dateOfDeactivation = newDeactivationDate;
      }
    } else {
      // New subscription
      user.category = order.categogy
      user.subscription.status = "active";
      user.subscription.id = order?.order_id;
      user.subscription.planId = order?.planId;
      user.subscription.duration = durationInMonths;
      user.subscription.coupon = order?.coupon;
      user.subscription.dateOfActivation = new Date();

      const newDeactivationDate = new Date();
      newDeactivationDate.setMonth(newDeactivationDate.getMonth() + durationInMonths);
      user.subscription.dateOfDeactivation = newDeactivationDate;
    }

    await user.save();

    // Send confirmation email
    await subQueue.add("payment_success", {
      options: {
        email: user.email,
        subject: "Leadlly Payment Success",
        message: `Your payment for the plan is successful.`,
        username: user.firstname,
        dashboardLink: `${process.env.FRONTEND_URL}`,
        tag: "payment_success",
      } as Options,
    });

    res.status(200).json(
      appRedirectURI
        ? `${appRedirectURI}?payment=success&reference=${razorpay_payment_id}`
        : `${process.env.FRONTEND_URL}/paymentsuccess?reference=${razorpay_payment_id}`
    );
  } catch (error: any) {
    next(new CustomError(error.message, 500));
  }
};

export const cancelSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new CustomError("User not found", 404));

    const subscriptionId = user.subscription.id;
    if (!subscriptionId || typeof subscriptionId !== "string") {
      return next(new CustomError("Subscription ID is not available", 400));
    }

    const payment = await Payment.findOne({
      razorpay_subscription_id: subscriptionId,
    });
    if (!payment) return next(new CustomError("Payment not found", 404));

    // Ensure payment.createdAt is converted to a timestamp (number) before subtraction
    const gap = Date.now() - new Date(payment.createdAt).getTime();

    const refundDays = process.env.REFUND_DAYS;
    if (!refundDays)
      return next(new CustomError("Please provide Refund Days", 404));

    const refundTime = Number(refundDays) * 24 * 60 * 60 * 1000;

    // Check if the gap is less than the refund time
    if (gap > refundTime) {
      return next(
        new CustomError("Cannot cancel subscription after 7 days.", 400)
      );
    } else {
      const options = {
        email: "support@leadlly.in",
        subject: `Request for subscription cancellation of ${user.email}`,
        message: `
        <h3>Subscription Cancellation Request</h3>
        <p>User Details:</p>
        <ul>
          <li><strong>Name:</strong> ${user.firstname} ${user.lastname}</li>
          <li><strong>Email:</strong> ${user.email}</li>
        </ul>
        <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
        <p><strong>Payment Details:</strong></p>
        <ul>
          <li><strong>Payment ID:</strong> ${payment.razorpay_payment_id}</li>
          <li><strong>Subscription ID:</strong> ${payment.razorpay_subscription_id}</li>
          <li><strong>Created At:</strong> ${payment.createdAt.toISOString()}</li>
          <li><strong>Plan ID:</strong> ${payment.planId || 'N/A'}</li>
          <li><strong>Coupon:</strong> ${payment.coupon || 'N/A'}</li>
        </ul>
        <p>This request is made within the refund period. Please process accordingly.</p>
      `,
     };

      await sendMail(options);

      await subQueue.add("SubscriptionCancel", {
        options: {
          email: user.email,
          subject: "Leadlly Subscription",
          message: `Hello ${user.firstname}! Your refund request has been sent to our team. You will receive a call in 3 - 4 working days. For any queries, please contact us at support@leadlly.in`,
        },
      });

      res.status(200).json({
        success: true,
        message: "Subscription cancel request successfully submitted.",
      });
    }
  } catch (error: any) {
    next(new CustomError(error.message, 500));
  }
};

export const getFreeTrialActive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.freeTrial.active = true;
    user.freeTrial.dateOfActivation = new Date();
    user.freeTrial.availed = true;

     // Calculate the deactivation date (14 days from now)
     user.freeTrial.dateOfDeactivation = new Date(user.freeTrial.dateOfActivation);
     user.freeTrial.dateOfDeactivation.setDate(user.freeTrial.dateOfDeactivation.getDate() + 14);

     user.category = 'free'
    await user.save();

    await subQueue.add("freetrial", {
      options: {
        email: user.email,
        subject: "Leadlly Free-Trial",
        message: "Free-Trail",
        username: user.firstname,
        dashboardLink: `${process.env.FRONTEND_URL}`,
        tag: "subscription_active",
      } as Options,
    });

    return res
      .status(200)
      .json({ message: "Free trial activated successfully", user });
  } catch (error) {
    next(error);
  }
};
