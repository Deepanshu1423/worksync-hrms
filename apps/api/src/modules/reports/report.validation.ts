import { z } from "zod";
import {
  AttendanceStatus,
  TaskPriority,
  TaskStatus,
  UserStatus,
} from "../../generated/prisma/client";

/**
 * Common date range query.
 *
 * Example:
 * ?fromDate=2026-05-01&toDate=2026-05-31
 */
const dateRangeSchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

/**
 * Attendance report filters.
 */
export const attendanceReportQuerySchema = dateRangeSchema.extend({
  userId: z.string().uuid("Invalid employee id").optional(),
  departmentId: z.string().uuid("Invalid department id").optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
});

/**
 * Task report filters.
 */
export const taskReportQuerySchema = dateRangeSchema.extend({
  projectId: z.string().uuid("Invalid project id").optional(),
  assignedToId: z.string().uuid("Invalid assigned employee id").optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
});

/**
 * Employee report filters.
 */
export const employeeReportQuerySchema = z.object({
  roleId: z.string().uuid("Invalid role id").optional(),
  departmentId: z.string().uuid("Invalid department id").optional(),
  designationId: z.string().uuid("Invalid designation id").optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

/**
 * Hire / Fire report filters.
 *
 * type:
 * - HIRED
 * - TERMINATED
 * - ALL
 */
export const hireFireReportQuerySchema = dateRangeSchema.extend({
  type: z.enum(["HIRED", "TERMINATED", "ALL"]).optional(),
  departmentId: z.string().uuid("Invalid department id").optional(),
});

export type AttendanceReportQueryInput = z.infer<
  typeof attendanceReportQuerySchema
>;

export type TaskReportQueryInput = z.infer<typeof taskReportQuerySchema>;

export type EmployeeReportQueryInput = z.infer<
  typeof employeeReportQuerySchema
>;

export type HireFireReportQueryInput = z.infer<
  typeof hireFireReportQuerySchema
>;