import { z } from "zod";

const createProjectSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "Project name is required",
    }).min(1, "Project name cannot be empty"),
    description: z.string().optional(),
  }),
});

export const ProjectValidation = {
  createProjectSchema,
};
