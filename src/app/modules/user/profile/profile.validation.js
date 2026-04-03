import { z } from "zod";

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    avatar: z.string().optional(), // Removed URL requirement as it can be a file or URL
  }),
});

export const UserProfileValidation = {
  updateProfileSchema,
};
