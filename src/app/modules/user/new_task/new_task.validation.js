import { z } from "zod";

const createTaskSchema = z.object({
  body: z.object({
    prompt: z.string({
      required_error: "Prompt is required",
    }),
    projectId: z.string().optional(),
    title: z.string().optional(),
    /** Force AI route: `project` → /api/generate, `chat` → /api/chat. Omit to auto-detect from prompt. */
    mode: z.enum(["project", "chat"]).optional(),
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

const previewProjectSchema = z.object({
  body: z.object({
    project_path: z.string().min(1).max(4000).optional(),
  }),
});

export const NewTaskValidation = {
  createTaskSchema,
  continueTaskSchema,
  previewProjectSchema,
};
