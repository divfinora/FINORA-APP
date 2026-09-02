
import express from "express";
import {protect} from "../../middleware/authMiddleware.js";

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,testWhatsapp,getEmployeeNotifications
} from "./notification.controller.js";

const router = express.Router();

/**
 * Get All Notifications
 * GET /api/notifications?page=1&limit=20&type=KYC
 */
router.get(
  "/get-all-notification",
  protect,
  getNotifications
);

/**
 * Get Unread Count
 * GET /api/notifications/unread-count
 */
router.get(
  "/unread-count",
  protect,
  getUnreadCount
);

/**
 * Mark Single Notification Read
 * PATCH /api/notifications/:id/read
 */
router.patch(
  "/:id/read",
  protect,
  markAsRead
);

/**
 * Mark All Notifications Read
 * PATCH /api/notifications/read-all
 */
router.patch(
  "/read-all",
  protect,
  markAllAsRead
);

/**
 * Delete Single Notification
 * DELETE /api/notifications/:id
 */
router.delete(
  "/:id",
  protect,
  deleteNotification
);
router.get(
  "/employee",
  protect,
  getEmployeeNotifications
);

router.post(
    "/test-whatsapp",
    protect,
    testWhatsapp
);
/**
 * Delete All Notifications
 * DELETE /api/notifications
 */
router.delete(
  "/",
  protect,
  deleteAllNotifications
);

export default router;

