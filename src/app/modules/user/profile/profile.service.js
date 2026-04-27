import prisma from "../../../prisma/client.js";

export const UserProfileService = {
  getProfile: async (id) => {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        credits: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      email: user.email,
      avatarUrl: user.avatar,
      credits: user.credits,
      plan: user.plan ? { id: user.plan.id, name: user.plan.name } : "free",
    };
  },

  updateProfile: async (id, data) => {
    const { firstName, lastName, avatar } = data;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        avatar,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        credits: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      name: `${updatedUser.firstName || ""} ${updatedUser.lastName || ""}`.trim(),
      email: updatedUser.email,
      avatarUrl: updatedUser.avatar,
      credits: updatedUser.credits,
      plan: updatedUser.plan
        ? { id: updatedUser.plan.id, name: updatedUser.plan.name }
        : "free",
    };
  },
};
