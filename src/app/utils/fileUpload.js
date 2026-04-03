import { createMulterUpload } from "../config/multer.config.js";

/**
 * Avatar Upload Middleware (Images only)
 */
export const uploadAvatar = createMulterUpload({
  folder: "avatars",
  allowedTypes: /jpeg|jpg|png|webp/,
  maxSize: 2 * 1024 * 1024, // 2MB for avatars
});

/**
 * ESSAY Upload Middleware (Standard usage of previous fileUpload.js)
 */
export const uploadEssay = createMulterUpload({
  folder: "essays",
  allowedTypes: /jpeg|jpg|png|webp|audio|mpeg|wav|ogg|mp3|pdf|doc|docx/,
  maxSize: 10 * 1024 * 1024, // 10MB
});

// Default export for backward compatibility if needed
export const upload = uploadEssay;
