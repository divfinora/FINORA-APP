import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    title: String,

    message: String,

    type: {
      type: String,
      enum: [
        // Employee notification filters
        "ASSIGNMENT",
        "REMINDER",

        // Existing types
        "LOAN",
        "KYC",
        "PAYMENT",
        "ACCOUNT",
        "TRANSACTION",
        "EMI",
        "PROMOTION",
        "CREDIT_SCORE",
        "SECURITY",
        "GENERAL",
        "EMI_REMINDER",
        "RECOVERY",
        "PROMISE_REMINDER",
        "FOLLOWUP_REMINDER",
        "LEGAL_NOTICE",
      ],
      default: "GENERAL",
    },

    visible: {
      type: Boolean,
      default: true,
    },

    read: {
      type: Boolean,
      default: false,
    },

    data: Object,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Notification",
  notificationSchema
);