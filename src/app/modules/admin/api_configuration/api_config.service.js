import prisma from "../../../prisma/client.js";

export const AdminApiConfigService = {
  getApiConfig: async (prisma) => {
    return await prisma.apiKey.findMany({
      orderBy: { createdAt: "asc" },
    });
  },

  updateApiConfig: async (prisma, id, data) => {
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("API key not found");
    }

    const updateData = {};
    if (data.key !== undefined) updateData.key = String(data.key || "");
    if (data.isActive !== undefined)
      updateData.isActive = Boolean(data.isActive);

    if (Object.keys(updateData).length > 0) {
      return await prisma.apiKey.update({
        where: { id },
        data: updateData,
      });
    }
    return existing;
  },

  createApiKey: async (prisma, data) => {
    return await prisma.apiKey.create({
      data: {
        name: data.name,
        key: data.key,
      },
    });
  },

  deleteApiKey: async (prisma, id) => {
    return await prisma.apiKey.delete({
      where: { id },
    });
  },
};
