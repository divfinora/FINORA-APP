import mongoose from "mongoose";
import dotenv from "dotenv";

import Employee from "./module/User/Employee_Schema.js";
import Notification from "./module/notification/notification.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// =========================================================
// EMPLOYEE
// =========================================================

const EMPLOYEE_ID = "6a5087a72c932458c10b02ae";

// =========================================================
// REAL FCM TOKEN
// =========================================================

const FCM_TOKEN =
  "dUomi_uqRim8LdiQN6AT2c:APA91bGSdkwGTTv3GgIvwUrf9NXBnO3xCjFg2mzGj8BFrUR1ynUfE5JJ7hAmf8RdsM5HGBF6LEG0Wa1We18nKaH71GMtV2FLNcMURMCqx-Od4bCuPk0aXAA";

// =========================================================
// SEED EMPLOYEE NOTIFICATIONS
// =========================================================

const seedEmployeeNotifications = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("MongoDB connected");

    // =====================================================
    // 1. FIND EMPLOYEE
    // =====================================================

    const employee = await Employee.findById(
      EMPLOYEE_ID
    );

    if (!employee) {
      throw new Error(
        `Employee not found: ${EMPLOYEE_ID}`
      );
    }

    console.log("\n======================================");
    console.log("EMPLOYEE FOUND");
    console.log("======================================");

    console.log(
      "Employee ID:",
      employee._id.toString()
    );

    console.log(
      "Employee Code:",
      employee.employeeId
    );

    console.log(
      "Name:",
      employee.fullName
    );

    console.log(
      "Role:",
      employee.role
    );

    // =====================================================
    // 2. SAVE REAL FCM TOKEN
    // =====================================================

    await Employee.findByIdAndUpdate(
      EMPLOYEE_ID,
      {
        $set: {
          fcmToken: FCM_TOKEN,
        },
      },
      {
        new: true,
      }
    );

    console.log(
      "\nReal FCM token saved successfully"
    );

    // =====================================================
    // 3. DELETE OLD TEST NOTIFICATIONS
    // =====================================================

    await Notification.deleteMany({
      user: employee._id,
      title: {
        $in: [
          "New Loan Assigned",
          "KYC Verification Assigned",
          "EMI Payment Reminder",
          "Promise to Pay Reminder",
          "Customer Follow-up Reminder",
          "Legal Notice Reminder",
        ],
      },
    });

    console.log(
      "Old test notifications removed"
    );

    // =====================================================
    // 4. CREATE ALL NOTIFICATION TYPES
    // =====================================================

    const notifications = [
      // ===================================================
      // ASSIGNMENT - LOAN
      // ===================================================

      {
        user: employee._id,

        type: "LOAN",

        title: "New Loan Assigned",

        message:
          "A new loan application has been assigned to you for verification.",

        read: false,

        visible: true,
      },

      // ===================================================
      // ASSIGNMENT - KYC
      // ===================================================

      {
        user: employee._id,

        type: "KYC",

        title: "KYC Verification Assigned",

        message:
          "A new KYC verification task has been assigned to you.",

        read: false,

        visible: true,
      },

      // ===================================================
      // REMINDER - EMI
      // ===================================================

      {
        user: employee._id,

        type: "EMI_REMINDER",

        title: "EMI Payment Reminder",

        message:
          "An EMI payment follow-up is pending.",

        read: false,

        visible: true,
      },

      // ===================================================
      // REMINDER - PROMISE
      // ===================================================

      {
        user: employee._id,

        type: "PROMISE_REMINDER",

        title: "Promise to Pay Reminder",

        message:
          "Customer promise-to-pay follow-up is due today.",

        read: false,

        visible: true,
      },

      // ===================================================
      // REMINDER - FOLLOW UP
      // ===================================================

      {
        user: employee._id,

        type: "FOLLOWUP_REMINDER",

        title: "Customer Follow-up Reminder",

        message:
          "Customer follow-up is pending. Please contact the customer.",

        read: true,

        visible: true,
      },

      // ===================================================
      // REMINDER - LEGAL NOTICE
      // ===================================================

      {
        user: employee._id,

        type: "LEGAL_NOTICE",

        title: "Legal Notice Reminder",

        message:
          "A legal notice follow-up is pending for the assigned case.",

        read: true,

        visible: true,
      },
    ];

    // =====================================================
    // 5. INSERT NOTIFICATIONS
    // =====================================================

    const createdNotifications =
      await Notification.insertMany(
        notifications
      );

    console.log(
      "\nNotifications created:",
      createdNotifications.length
    );

    // =====================================================
    // 6. COUNT UNREAD
    // =====================================================

    const unreadCount =
      await Notification.countDocuments({
        user: employee._id,
        visible: true,
        read: false,
      });

    // =====================================================
    // 7. FINAL OUTPUT
    // =====================================================

    console.log("\n======================================");
    console.log("EMPLOYEE NOTIFICATION SEED COMPLETED");
    console.log("======================================");

    console.log(
      "Employee:",
      employee.fullName
    );

    console.log(
      "Employee Code:",
      employee.employeeId
    );

    console.log(
      "Role:",
      employee.role
    );

    console.log(
      "FCM Token:",
      FCM_TOKEN
    );

    console.log(
      "Total Notifications:",
      createdNotifications.length
    );

    console.log(
      "Unread Notifications:",
      unreadCount
    );

    // =====================================================
    // ALL FILTER
    // =====================================================

    console.log("\n======================================");
    console.log("ALL FILTER");
    console.log("======================================");

    console.log("LOAN");
    console.log("KYC");
    console.log("EMI_REMINDER");
    console.log("PROMISE_REMINDER");
    console.log("FOLLOWUP_REMINDER");
    console.log("LEGAL_NOTICE");

    // =====================================================
    // ASSIGNMENT FILTER
    // =====================================================

    console.log("\n======================================");
    console.log("ASSIGNMENT FILTER");
    console.log("======================================");

    console.log("LOAN");
    console.log("KYC");

    // =====================================================
    // REMINDER FILTER
    // =====================================================

    console.log("\n======================================");
    console.log("REMINDER FILTER");
    console.log("======================================");

    console.log("EMI_REMINDER");
    console.log("PROMISE_REMINDER");
    console.log("FOLLOWUP_REMINDER");
    console.log("LEGAL_NOTICE");

    // =====================================================
    // FRONTEND API TEST
    // =====================================================

    console.log("\n======================================");
    console.log("FRONTEND API TEST");
    console.log("======================================");

    console.log(
      "ALL:"
    );

    console.log(
      "GET /api/notifications/employee?page=1&limit=20&filter=ALL"
    );

    console.log(
      "\nASSIGNMENT:"
    );

    console.log(
      "GET /api/notifications/employee?page=1&limit=20&filter=ASSIGNMENT"
    );

    console.log(
      "\nREMINDER:"
    );

    console.log(
      "GET /api/notifications/employee?page=1&limit=20&filter=REMINDER"
    );

    console.log("\nSeed completed successfully.");
  } catch (error) {
    console.error(
      "Employee notification seed failed:",
      error
    );
  } finally {
    await mongoose.connection.close();

    console.log(
      "MongoDB connection closed"
    );
  }
};

seedEmployeeNotifications();