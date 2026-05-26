import { z } from "zod";

export const createOfficeLocationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Office name must be at least 2 characters")
    .max(100, "Office name must not exceed 100 characters"),

  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(255, "Address must not exceed 255 characters"),

  latitude: z
    .number({
      required_error: "Latitude is required",
      invalid_type_error: "Latitude must be a number",
    })
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),

  longitude: z
    .number({
      required_error: "Longitude is required",
      invalid_type_error: "Longitude must be a number",
    })
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),

  allowedRadius: z
    .number({
      invalid_type_error: "Allowed radius must be a number",
    })
    .int("Allowed radius must be an integer")
    .min(50, "Allowed radius must be at least 50 meters")
    .max(5000, "Allowed radius must not exceed 5000 meters")
    .optional(),
});

export const updateOfficeLocationSchema = createOfficeLocationSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
  });

export const updateOfficeLocationStatusSchema = z.object({
  isActive: z.boolean({
    required_error: "Status is required",
    invalid_type_error: "Status must be true or false",
  }),
});

export const officeLocationIdSchema = z.object({
  id: z.string().uuid("Invalid office location id"),
});

export type CreateOfficeLocationInput = z.infer<
  typeof createOfficeLocationSchema
>;

export type UpdateOfficeLocationInput = z.infer<
  typeof updateOfficeLocationSchema
>;

export type UpdateOfficeLocationStatusInput = z.infer<
  typeof updateOfficeLocationStatusSchema
>;