import { z } from "zod";
import { AttendanceStatus } from "../../generated/prisma/client";

/**
 * z.coerce.number() is used because multipart/form-data sends values as strings.
 * Example: "28.6139" will be converted to 28.6139 automatically.
 */
export const attendanceLocationSchema = z.object({
  latitude: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),

  longitude: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),

  accuracy: z.coerce
    .number()
    .min(0, "Accuracy must be a positive number")
    .optional()
    .nullable(),

  address: z.string().trim().max(255).optional().nullable(),
});

export const attendanceAdminQuerySchema = z.object({
  date: z.string().optional(),
  userId: z.string().uuid("Invalid user id").optional(),
  departmentId: z.string().uuid("Invalid department id").optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
});

export const attendanceTeamQuerySchema = z.object({
  date: z.string().optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
});

export type AttendanceTeamQueryInput = z.infer<
  typeof attendanceTeamQuerySchema
>;

export type AttendanceLocationInput = z.infer<typeof attendanceLocationSchema>;

export type AttendanceAdminQueryInput = z.infer<
  typeof attendanceAdminQuerySchema
>;