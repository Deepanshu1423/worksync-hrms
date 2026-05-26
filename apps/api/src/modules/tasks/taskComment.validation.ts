import { z } from "zod";

/**
 * Validate task id from URL.
 */
export const taskCommentTaskParamSchema = z.object({
  taskId: z.string().uuid("Invalid task id"),
});

/**
 * Validate task id and comment id from URL.
 */
export const taskCommentParamSchema = z.object({
  taskId: z.string().uuid("Invalid task id"),
  commentId: z.string().uuid("Invalid comment id"),
});

/**
 * Create task comment validation.
 */
export const createTaskCommentSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(2, "Comment must be at least 2 characters")
    .max(1000, "Comment must not exceed 1000 characters"),
});

export type CreateTaskCommentInput = z.infer<typeof createTaskCommentSchema>;