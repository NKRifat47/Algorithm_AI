import prisma from "../../../prisma/client.js";
import { Cache } from "../../../utils/cache.js";

const listTemplates = async (userId, query) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 12;
  const skip = (page - 1) * limit;

  const q = query.q?.trim();
  const category = query.category?.trim();

  const whereBase = {
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const favoritesOnly = Boolean(query.favoritesOnly);

  const normalizedQuery = {
    page: Number(page),
    limit: Number(limit),
    q: q || "",
    category: category || "",
    favoritesOnly,
  };

  const cacheKey = `library:templates:user:${userId}:${Buffer.from(
    JSON.stringify(normalizedQuery),
    "utf8",
  ).toString("base64url")}`;

  return await Cache.getOrSetJson(
    cacheKey,
    async () => {
      if (favoritesOnly) {
        const [total, items] = await Promise.all([
          prisma.userFavorite.count({
            where: { userId, template: { ...whereBase } },
          }),
          prisma.userFavorite.findMany({
            where: { userId, template: { ...whereBase } },
            include: { template: true },
            orderBy: { id: "desc" },
            skip,
            take: limit,
          }),
        ]);

        return {
          meta: { page, limit, total },
          data: items.map((f) => ({
            ...f.template,
            isFavorite: true,
          })),
        };
      }

      const [total, items, favs] = await Promise.all([
        prisma.template.count({ where: whereBase }),
        prisma.template.findMany({
          where: whereBase,
          orderBy: { title: "asc" },
          skip,
          take: limit,
        }),
        prisma.userFavorite.findMany({
          where: { userId },
          select: { templateId: true },
        }),
      ]);

      const favoriteSet = new Set(favs.map((f) => f.templateId));

      return {
        meta: { page, limit, total },
        data: items.map((t) => ({
          ...t,
          isFavorite: favoriteSet.has(t.id),
        })),
      };
    },
    30,
  );
};

const toggleFavorite = async (userId, templateId) => {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });
  if (!template) {
    const err = new Error("Template not found");
    err.statusCode = 404;
    throw err;
  }

  const existing = await prisma.userFavorite.findFirst({
    where: { userId, templateId },
  });

  if (existing) {
    await prisma.userFavorite.delete({ where: { id: existing.id } });
    await Cache.delByPrefix(`library:templates:user:${userId}:`);
    return { templateId, isFavorite: false };
  }

  await prisma.userFavorite.create({ data: { userId, templateId } });
  await Cache.delByPrefix(`library:templates:user:${userId}:`);
  return { templateId, isFavorite: true };
};

export const LibraryService = {
  listTemplates,
  toggleFavorite,
};
