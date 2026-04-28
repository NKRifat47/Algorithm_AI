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

const continueTaskSchema = z.object({
  body: z.object({
    prompt: z.string({
      required_error: "Prompt is required",
    }),
    session_id: z.string({
      required_error: "session_id is required",
    }),
  }),
});

export const NewTaskValidation = {
  createTaskSchema,
  continueTaskSchema,
};
