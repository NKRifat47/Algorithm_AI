import { z } from "zod";

const createProjectSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "Project name is required",
    }).min(1, "Project name cannot be empty"),
    description: z.string().optional(),
  }),
});

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    prompt: z.string({
      required_error: "Prompt is required",
    }).min(1, "Prompt cannot be empty"),
  }),
});

export const ProjectValidation = {
  createProjectSchema,
  createTaskSchema,
};
