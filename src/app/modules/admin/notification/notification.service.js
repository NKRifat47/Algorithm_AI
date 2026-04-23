import { emitToAdmins } from "../../../socket/socket.js";

export const AdminNotificationService = {
  list: async (prisma, { adminUserId, unreadOnly, limit = 20 } = {}) => {
    const safeLimit = Number.isFinite(Number(limit))
      ? Math.min(Math.max(Number(limit), 1), 100)
      : 20;

    const where = {
      userId: adminUserId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      select: {
        id: true,
        type: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
    });
  },

  markRead: async (prisma, { adminUserId, notificationId }) => {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: adminUserId,
      },
      data: { isRead: true },
    });

    return null;
  },

  markAllRead: async (prisma, { adminUserId }) => {
    await prisma.notification.updateMany({
      where: { userId: adminUserId, isRead: false },
      data: { isRead: true },
    });
    return null;
  },

  notifyAdmins: async (prisma, { type, message, meta }) => {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (!admins.length) return { created: 0 };

    const data = admins.map((a) => ({
      userId: a.id,
      type,
      message,
    }));

    const created = await prisma.notification.createMany({ data });

    emitToAdmins("admin:notification:new", {
      type,
      message,
      meta: meta ?? {},
      createdAt: new Date().toISOString(),
    });

    return { created: created.count || 0 };
  },
};

