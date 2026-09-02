import Notification from "./notification.model.js";
  import notificationService from "./service/notification.service.js";
/**
 * GET /notifications?page=1&limit=20&type=KYC
 */
export const getNotifications = async (
  req,
  res
) => {
  try {
    const page =
      Number(req.query.page) || 1;

    const limit =
      Number(req.query.limit) || 20;

    const skip =
      (page - 1) * limit;

    const filter = {
      user: req.user._id,
    };

    if (req.query.type) {
      filter.type =
        req.query.type;
    }

    const [notifications, total] =
      await Promise.all([
        Notification.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Notification.countDocuments(
          filter
        ),
      ]);

    return res.status(200).json({
      success: true,
      data: notifications,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    });
  } catch (error) {
    console.error(
      "Get Notifications Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch notifications",
    });
  }
};

/**
 * GET /notifications/unread-count
 */
export const getUnreadCount =
  async (req, res) => {
    try {
      const count =
        await Notification.countDocuments(
          {
            user: req.user._id,
            read: false,
          }
        );

      return res.status(200).json({
        success: true,
        unreadCount: count,
      });
    } catch (error) {
      console.error(
        "Unread Count Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch unread count",
      });
    }
  };

/**
 * PATCH /notifications/:id/read
 */
export const markAsRead =
  async (req, res) => {
    try {
      const notification =
        await Notification.findOneAndUpdate(
          {
            _id: req.params.id,
            user: req.user._id,
          },
          {
            read: true,
          },
          {
            new: true,
          }
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Notification marked as read",
        data: notification,
      });
    } catch (error) {
      console.error(
        "Mark Read Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update notification",
      });
    }
  };

/**
 * PATCH /notifications/read-all
 */
export const markAllAsRead =
  async (req, res) => {
    try {
      const result =
        await Notification.updateMany(
          {
            user: req.user._id,
            read: false,
          },
          {
            read: true,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "All notifications marked as read",
        modifiedCount:
          result.modifiedCount,
      });
    } catch (error) {
      console.error(
        "Read All Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update notifications",
      });
    }
  };

/**
 * DELETE /notifications/:id
 */
export const deleteNotification =
  async (req, res) => {
    try {
      const notification =
        await Notification.findOneAndDelete(
          {
            _id: req.params.id,
            user: req.user._id,
          }
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Notification deleted",
      });
    } catch (error) {
      console.error(
        "Delete Notification Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete notification",
      });
    }
  };

/**
 * DELETE /notifications
 */
export const deleteAllNotifications =
  async (req, res) => {
    try {
      const result =
        await Notification.deleteMany(
          {
            user: req.user._id,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "All notifications deleted",
        deletedCount:
          result.deletedCount,
      });
    } catch (error) {
      console.error(
        "Delete All Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete notifications",
      });
    }
  };





  
  export const testWhatsapp = async (req, res) => {
    try {
  
      await notificationService.send({
  
        user: req.user._id,
  
        phone: "91XXXXXXXXXX", // apna WhatsApp number
  
        title: "Testing",
  
        message: "Hello Surjeet 🚀 Notification Engine Working",
  
        type: "GENERAL",
  
        sendWhatsapp: true
  
      });
  
      return res.json({
        success: true,
        message: "Notification Sent"
      });
  
    } catch (err) {
  
      return res.status(500).json({
        success: false,
        message: err.message
      });
  
    }
  };



  export const getEmployeeNotifications = async (req, res) => {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const filterType = (
      req.query.filter || "ALL"
    ).toUpperCase();

    const skip = (page - 1) * limit;

    // ==========================================
    // BASE FILTER
    // ==========================================

    const filter = {
      user: req.user._id,
      visible: true,
    };

    // ==========================================
    // FILTER
    // ==========================================

    if (filterType === "ASSIGNMENT") {
      filter.type = {
        $in: [
          "LOAN",
          "KYC",
        ],
      };
    }

    if (filterType === "REMINDER") {
      filter.type = {
        $in: [
          "EMI_REMINDER",
          "PROMISE_REMINDER",
          "FOLLOWUP_REMINDER",
          "LEGAL_NOTICE",
        ],
      };
    }

    // ==========================================
    // FETCH
    // ==========================================

    const [
      notifications,
      total,
      unreadCount,
    ] = await Promise.all([
      Notification.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Notification.countDocuments(filter),

      Notification.countDocuments({
        user: req.user._id,
        visible: true,
        read: false,
      }),
    ]);

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      filter: filterType,

      unreadCount,

      data: notifications,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit
        ),
      },
    });

  } catch (error) {
    console.error(
      "Get Employee Notifications Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch employee notifications",
    });
  }
};