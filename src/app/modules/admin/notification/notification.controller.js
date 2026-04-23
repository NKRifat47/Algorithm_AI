import prisma from "../../../prisma/client.js";
import DevBuildError from "../../../lib/DevBuildError.js";
import { AdminNotificationService } from "./notification.service.js";

const list = async (req, res) => {
  try {
    const { unreadOnly, limit } = req.query;
    const adminUserId = req?.user?.id;

    if (!adminUserId) throw new DevBuildError("Unauthorized", 401);

    const data = await AdminNotificationService.list(prisma, {
      adminUserId,
      unreadOnly: unreadOnly === "true",
      limit,
    });

    return res.json({
      success: true,
      message: "Notifications retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("admin notification list error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications",
    });
  }
};

const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req?.user?.id;

    if (!adminUserId) throw new DevBuildError("Unauthorized", 401);
    if (!id) throw new DevBuildError("Notification id is required", 400);

    await AdminNotificationService.markRead(prisma, {
      adminUserId,
      notificationId: id,
    });

    return res.json({
      success: true,
      message: "Notification marked as read",
      data: null,
    });
  } catch (error) {
    console.error("admin notification markRead error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
};

const markAllRead = async (req, res) => {
  try {
    const adminUserId = req?.user?.id;
    if (!adminUserId) throw new DevBuildError("Unauthorized", 401);

    await AdminNotificationService.markAllRead(prisma, { adminUserId });

    return res.json({
      success: true,
      message: "All notifications marked as read",
      data: null,
    });
  } catch (error) {
    console.error("admin notification markAllRead error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
};

export const AdminNotificationController = {
  list,
  markRead,
  markAllRead,
};

