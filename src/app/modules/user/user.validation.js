import { z } from "zod";

const registerUserSchema = z.object({
    body: z.object({
        name: z.string().min(1, { message: "Name is required" }),
        email: z.string().email({ message: "Invalid email address" }),
        password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    }),
});

const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        email: z.string().email({ message: "Invalid email address" }).optional(),
        // Note: 'avatar' file is handled by Multer separately
    }),
});

export const UserValidation = {
    registerUserSchema,
    updateProfileSchema,
};
