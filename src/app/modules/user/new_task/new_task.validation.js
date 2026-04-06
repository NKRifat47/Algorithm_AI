import { z } from "zod";

const createTaskSchema = z.object({
  body: z.object({
    prompt: z.string({
      required_error: "Prompt is required",
    }),
    projectId: z.string().optional(),
    title: z.string().optional(),
  }),
});

export const NewTaskValidation = {
  createTaskSchema,
};
