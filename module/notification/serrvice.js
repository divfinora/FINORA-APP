
import { getMessaging } from "firebase-admin/messaging";
import Notification from "./notification.model.js";
import NotificationPreference from "./notification-preference.model.js";
import User from "../User/models.js";

const preferenceMap = {
  LOAN: "loanUpdates",
  EMI: "emiReminders",
  CREDIT_SCORE: "creditScoreUpdates",
  PROMOTION: "promotionalOffers",
};

const mandatoryTypes = [
  "SECURITY",
  "PAYMENT",
  "TRANSACTION",
  "KYC",
  "ACCOUNT",
];

export const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
}) => {
  return getMessaging().send({
    token,

    notification: {
      title,
      body,
    },

    android: {
      priority: "high",
      notification: {
        sound: "default",
      },
    },

    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },

    data: Object.entries(data).reduce(
      (acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      },
      {}
    ),
  });
};

export const sendNotification = async ({
  userId,
  title,
  message,
  type = "GENERAL",
  data = {},
}) => {
  try {
    const user = await User.findById(userId)
      .select("fcmToken")
      .lean();

    if (!user) {
      return null;
    }

    let visible = true;
    let sendPush = true;

    // Optional notifications
    if (
      !mandatoryTypes.includes(type)
    ) {
      const preference =
        await NotificationPreference.findOne({
          user: userId,
        }).lean();

      if (preference) {
        // Master Push Switch
        if (
          preference.pushEnabled === false
        ) {
          visible = false;
          sendPush = false;
        }

        const field =
          preferenceMap[type];

        if (
          field &&
          preference[field] === false
        ) {
          visible = false;
          sendPush = false;
        }
      }
    }

    // Always Save Notification
    const notification =
      await Notification.create({
        user: userId,
        title,
        message,
        type,
        visible,
        data,
      });

    // Push Notification
    if (
      sendPush &&
      user.fcmToken
    ) {
      try {
        await sendPushNotification({
          token: user.fcmToken,
          title,
          body: message,
          data: {
            notificationId:
              notification._id.toString(),
            type,
            ...data,
          },
        });
      } catch (pushError) {
        console.error(
          "Push Notification Error:",
          pushError.message
        );

        // Invalid Token Cleanup
        if (
          pushError.code ===
            "messaging/registration-token-not-registered" ||
          pushError.code ===
            "messaging/invalid-registration-token"
        ) {
          await User.findByIdAndUpdate(
            userId,
            {
              $unset: {
                fcmToken: 1,
              },
            }
          );
        }
      }
    }

    return notification;
  } catch (error) {
    console.error(
      "Notification Error:",
      error
    );

    return null;
  }
};




