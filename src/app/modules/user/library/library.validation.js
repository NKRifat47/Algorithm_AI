import { z } from "zod";

const listTemplatesSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    favoritesOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
  }),
});

const listFavoritesSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
});

const toggleFavoriteSchema = z.object({
  params: z.object({
    templateId: z.string({ required_error: "templateId is required" }),
  }),
});

export const LibraryValidation = {
  listTemplatesSchema,
  listFavoritesSchema,
  toggleFavoriteSchema,
};
