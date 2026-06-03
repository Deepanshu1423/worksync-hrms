import { api } from "./api.service";
import {
  AdminAttendanceResponse,
  AttendanceRecord,
} from "@/types/attendance.types";

/**
 * Fetches all attendance records for Admin/HR.
 *
 * Backend route:
 * GET /api/attendance/admin
 */
export const getAdminAttendanceRecords = async (): Promise<
  AttendanceRecord[]
> => {
  const response = await api.get<AdminAttendanceResponse>("/attendance/admin");

  return response.data.data.attendanceRecords;
};