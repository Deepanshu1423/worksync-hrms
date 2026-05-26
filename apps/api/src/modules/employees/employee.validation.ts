import { z } from "zod";
import { UserStatus } from "../../generated/prisma/client";

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("Invalid email address"),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Mobile number must be a valid 10 digit Indian number"),
  password: z.string().min(8, "Password must be at least 8 characters"),

  roleId: z.string().uuid("Invalid role id"),
  departmentId: z.string().uuid("Invalid department id").optional().nullable(),
  designationId: z.string().uuid("Invalid designation id").optional().nullable(),
  managerId: z.string().uuid("Invalid manager id").optional().nullable(),

  dateOfJoining: z.string().optional().nullable(),
});

export const updateEmployeeSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email("Invalid email address").optional(),
    mobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Mobile number must be a valid 10 digit Indian number")
      .optional(),

    roleId: z.string().uuid("Invalid role id").optional(),
    departmentId: z.string().uuid("Invalid department id").optional().nullable(),
    designationId: z.string().uuid("Invalid designation id").optional().nullable(),
    managerId: z.string().uuid("Invalid manager id").optional().nullable(),

    status: z.nativeEnum(UserStatus).optional(),
    dateOfJoining: z.string().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
  });

export const terminateEmployeeSchema = z.object({
  terminationReason: z
    .string()
    .trim()
    .min(5, "Termination reason must be at least 5 characters")
    .max(500, "Termination reason must not exceed 500 characters"),

  effectiveDate: z.string().optional().nullable(),
});

export const employeeIdSchema = z.object({
  id: z.string().uuid("Invalid employee id"),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type TerminateEmployeeInput = z.infer<typeof terminateEmployeeSchema>;