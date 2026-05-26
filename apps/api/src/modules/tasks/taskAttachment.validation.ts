import { z } from "zod";

/**
 * Validate task id from URL params.
 */
export const taskAttachmentParamSchema = z.object({
  taskId: z.string().uuid("Invalid task id"),
});