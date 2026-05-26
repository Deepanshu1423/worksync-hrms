import { z } from "zod";
import { TaskPriority, TaskStatus } from "../../generated/prisma/client";

/**
 * Create task validation.
 *
 * Task can be linked with a project, but projectId is optional.
 * This allows Admin/Manager to create both:
 * - project-based tasks
 * - general employee tasks
 */
export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Task title must be at least 3 characters")
    .max(150, "Task title must not exceed 150 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Description must not exceed 1000 characters")
    .optional()
    .nullable(),

  projectId: z.string().uuid("Invalid project id").optional().nullable(),

  assignedToId: z.string().uuid("Invalid assigned employee id"),

  priority: z.nativeEnum(TaskPriority).optional(),

  dueDate: z.string().optional().nullable(),
});

/**
 * Update task validation.
 * At least one field is required for update.
 */
export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),

    description: z.string().trim().max(1000).optional().nullable(),

    projectId: z.string().uuid("Invalid project id").optional().nullable(),

    assignedToId: z.string().uuid("Invalid assigned employee id").optional(),

    priority: z.nativeEnum(TaskPriority).optional(),

    dueDate: z.string().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
  });

/**
 * Task status update validation.
 *
 * Employee will mainly use this API to move task status:
 * PENDING → IN_PROGRESS → IN_REVIEW
 *
 * Admin/Manager can also mark COMPLETED/CANCELLED.
 */
export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

/**
 * Task id validation.
 */
export const taskIdSchema = z.object({
  id: z.string().uuid("Invalid task id"),
});

/**
 * Query filters for task listing.
 */
export const taskQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  projectId: z.string().uuid("Invalid project id").optional(),
  assignedToId: z.string().uuid("Invalid assigned employee id").optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;