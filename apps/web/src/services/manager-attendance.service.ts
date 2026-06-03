import { api } from "./api.service";
import { AttendanceRecord } from "@/types/attendance.types";

type ManagerTeamAttendanceResponse = {
  success: boolean;
  message: string;
  data: {
    attendanceRecords: AttendanceRecord[];
  };
};

/**
 * Fetch attendance records of manager's assigned team members.
 *
 * Backend route:
 * GET /api/attendance/team
 */
export const getManagerTeamAttendanceRecords = async (): Promise<
  AttendanceRecord[]
> => {
  const response = await api.get<ManagerTeamAttendanceResponse>(
    "/attendance/team"
  );

  return response.data.data.attendanceRecords;
};