import prisma from "../../../prisma/client.js";

export const AdminProfileService = {
  getProfile: async (id) => {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        country: true,
        avatar: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      firstname: user.firstName,
      lastname: user.lastName,
      gender: user.gender,
      country: user.country,
      avatarUrl: user.avatar,
    };
  },

  updateProfile: async (id, data) => {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstname,
        lastName: data.lastname,
        gender: data.gender,
        country: data.country,
        avatar: data.avatarUrl,
      },
    });

    return {
      name: `${updatedUser.firstName} ${updatedUser.lastName}`,
      email: updatedUser.email,
      firstname: updatedUser.firstName,
      lastname: updatedUser.lastName,
      gender: updatedUser.gender,
      country: updatedUser.country,
      avatarUrl: updatedUser.avatar,
    };
  },
};
