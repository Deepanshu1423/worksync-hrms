import { z } from "zod";

/**
 * Project status values.
 * Keeping this in validation because database currently stores status as String.
 */
export const projectStatusSchema = z.enum([
  "PLANNED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
]);

/**
 * Create project validation.
 * This project is for employee task/work tracking, not solar generation monitoring.
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(120, "Project name must not exceed 120 characters"),

  description: z
    .string()
    .trim()
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .nullable(),

  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),

  status: projectStatusSchema.optional(),
});

/**
 * Update project validation.
 * At least one field is required.
 */
export const updateProjectSchema = createProjectSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field is required for update",
  }
);

/**
 * Project id validation.
 */
export const projectIdSchema = z.object({
  id: z.string().uuid("Invalid project id"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;