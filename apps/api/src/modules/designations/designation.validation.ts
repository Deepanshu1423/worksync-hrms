import { z } from "zod";

export const createDesignationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Designation name must be at least 2 characters")
    .max(80, "Designation name must not exceed 80 characters"),

  description: z
    .string()
    .trim()
    .max(255, "Description must not exceed 255 characters")
    .optional()
    .nullable(),
});

export const updateDesignationSchema = createDesignationSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field is required for update",
  }
);

export const designationIdSchema = z.object({
  id: z.string().uuid("Invalid designation id"),
});

export type CreateDesignationInput = z.infer<typeof createDesignationSchema>;
export type UpdateDesignationInput = z.infer<typeof updateDesignationSchema>;