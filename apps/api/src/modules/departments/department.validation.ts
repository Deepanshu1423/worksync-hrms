import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Department name must be at least 2 characters")
    .max(80, "Department name must not exceed 80 characters"),

  description: z
    .string()
    .trim()
    .max(255, "Description must not exceed 255 characters")
    .optional()
    .nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field is required for update",
  }
);

export const departmentIdSchema = z.object({
  id: z.string().uuid("Invalid department id"),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;