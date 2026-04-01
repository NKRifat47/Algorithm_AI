import prisma from "../../../prisma/client.js";
import DevBuildError from "../../../lib/DevBuildError.js";

export const AdminUserService = {
  getAllUsers: async (prisma) => {
    // Fetch users with their plan information, excluding ADMIN users generally,
    // or just fetch all users who have ROLE = 'USER'
    const users = await prisma.user.findMany({
      where: {
        role: "USER",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        plan: {
          select: {
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format the result to match what the frontend likely needs
    return users.map((user) => ({
      id: user.id,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A",
      email: user.email,
      plan: user.plan?.name || "N/A", // Fallback to Free if no plan is assigned
      createdAt: user.createdAt,
    }));
  },

  deleteUser: async (prisma, userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new DevBuildError("User not found", 404);
    }

    if (user.role === "ADMIN") {
      throw new DevBuildError("Cannot delete an admin user", 403);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete user favorites
      await tx.userFavorite.deleteMany({ where: { userId } });

      await tx.subscription.deleteMany({ where: { userId } });
      await tx.payment.deleteMany({ where: { userId } });

      await tx.notification.deleteMany({ where: { userId } });
      await tx.notificationSetting.deleteMany({ where: { userId } });

      await tx.apiUsage.deleteMany({ where: { userId } });

      await tx.file.deleteMany({ where: { userId } });

      const tasks = await tx.task.findMany({
        where: { userId },
        select: { id: true },
      });
      const taskIds = tasks.map((t) => t.id);
      await tx.taskStep.deleteMany({ where: { taskId: { in: taskIds } } });
      await tx.message.deleteMany({ where: { taskId: { in: taskIds } } });
      await tx.task.deleteMany({ where: { userId } });

      // 7. Delete Projects and Project related records (websites, secrets, integrations)
      const projects = await tx.project.findMany({
        where: { userId },
        select: { id: true },
      });
      const projectIds = projects.map((p) => p.id);

      const websites = await tx.website.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true },
      });
      const websiteIds = websites.map((w) => w.id);

      await tx.websiteFile.deleteMany({
        where: { websiteId: { in: websiteIds } },
      });
      await tx.deployment.deleteMany({
        where: { websiteId: { in: websiteIds } },
      });
      await tx.analyticsEvent.deleteMany({
        where: { websiteId: { in: websiteIds } },
      });
      await tx.analytics.deleteMany({
        where: { websiteId: { in: websiteIds } },
      });
      await tx.website.deleteMany({ where: { projectId: { in: projectIds } } });

      await tx.secret.deleteMany({ where: { projectId: { in: projectIds } } });
      await tx.integration.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await tx.project.deleteMany({ where: { userId } });

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return null;
  },
};
