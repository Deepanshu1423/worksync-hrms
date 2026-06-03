import { z } from "zod";

/**
 * Office location id validation.
 *
 * Important:
 * We are NOT using .uuid() here because your Prisma id may not be UUID format.
 * We only check that id is a non-empty string.
 *
 * Controller uses:
 * officeLocationIdSchema.parse(req.params)
 */
export const officeLocationIdSchema = z.object({
  id: z.string().min(1, "Invalid office location id"),
});

/**
 * Create office location validation.
 *
 * Controller uses:
 * createOfficeLocationSchema.parse(req.body)
 *
 * allowedRadius is only for reference.
 * Attendance is NOT blocked using this radius.
 */
export const createOfficeLocationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Location name must be at least 2 characters"),

  address: z.string().trim().optional().nullable(),

  latitude: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),

  longitude: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),

  allowedRadius: z.coerce
    .number()
    .int("Allowed radius must be a whole number")
    .positive("Allowed radius must be greater than 0")
    .optional(),

  isActive: z.boolean().optional(),
});

/**
 * Update office location validation.
 *
 * Controller uses:
 * updateOfficeLocationSchema.parse(req.body)
 *
 * All fields are optional because edit may update selected values only.
 */
export const updateOfficeLocationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Location name must be at least 2 characters")
    .optional(),

  address: z.string().trim().optional().nullable(),

  latitude: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90")
    .optional(),

  longitude: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180")
    .optional(),

  allowedRadius: z.coerce
    .number()
    .int("Allowed radius must be a whole number")
    .positive("Allowed radius must be greater than 0")
    .optional(),

  isActive: z.boolean().optional(),
});

/**
 * Activate / deactivate office location validation.
 *
 * Controller uses:
 * updateOfficeLocationStatusSchema.parse(req.body)
 */
export const updateOfficeLocationStatusSchema = z.object({
  isActive: z.boolean({
    message: "isActive must be true or false",
  }),
});

/**
 * Delete office location validation.
 * Same schema as id validation.
 */
export const deleteOfficeLocationSchema = officeLocationIdSchema;

/**
 * Export input types for service layer.
 */
export type CreateOfficeLocationInput = z.infer<
  typeof createOfficeLocationSchema
>;

export type UpdateOfficeLocationInput = z.infer<
  typeof updateOfficeLocationSchema
>;

export type UpdateOfficeLocationStatusInput = z.infer<
  typeof updateOfficeLocationStatusSchema
>;