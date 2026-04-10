import prisma from "../../../prisma/client.js";
import { Cache } from "../../../utils/cache.js";

export const AdminApiConfigService = {
  getApiConfig: async (prisma) => {
    return await Cache.getOrSetJson(
      "admin:api-config",
      async () => {
        return await prisma.apiKey.findMany({
          orderBy: { createdAt: "asc" },
        });
      },
      60,
    );
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
      const updated = await prisma.apiKey.update({
        where: { id },
        data: updateData,
      });
      await Cache.del("admin:api-config");
      return updated;
    }
    return existing;
  },

  createApiKey: async (prisma, data) => {
    const created = await prisma.apiKey.create({
      data: {
        name: data.name,
        key: data.key,
      },
    });
    await Cache.del("admin:api-config");
    return created;
  },

  deleteApiKey: async (prisma, id) => {
    const deleted = await prisma.apiKey.delete({
      where: { id },
    });
    await Cache.del("admin:api-config");
    return deleted;
  },
};
