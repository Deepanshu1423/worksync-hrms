import { api } from "./api.service";
import {
  AttendanceReport,
  AttendanceReportResponse,
  EmployeeReport,
  EmployeeReportResponse,
  HireFireReport,
  HireFireReportResponse,
  ReportQuery,
  TaskReport,
  TaskReportResponse,
} from "@/types/report.types";

/**
 * Removes empty values from query params.
 * This prevents sending empty strings to backend filters.
 */
function cleanParams(params?: ReportQuery) {
  if (!params) return {};

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      return value !== "" && value !== undefined && value !== null;
    })
  );
}

/**
 * Fetch attendance report.
 *
 * Backend route:
 * GET /api/reports/attendance
 */
export const getAttendanceReport = async (
  params?: ReportQuery
): Promise<AttendanceReport> => {
  const response = await api.get<AttendanceReportResponse>(
    "/reports/attendance",
    {
      params: cleanParams(params),
    }
  );

  return response.data.data.report;
};

/**
 * Fetch task report.
 *
 * Backend route:
 * GET /api/reports/tasks
 */
export const getTaskReport = async (
  params?: ReportQuery
): Promise<TaskReport> => {
  const response = await api.get<TaskReportResponse>("/reports/tasks", {
    params: cleanParams(params),
  });

  return response.data.data.report;
};

/**
 * Fetch employee report.
 *
 * Backend route:
 * GET /api/reports/employees
 */
export const getEmployeeReport = async (
  params?: ReportQuery
): Promise<EmployeeReport> => {
  const response = await api.get<EmployeeReportResponse>("/reports/employees", {
    params: cleanParams(params),
  });

  return response.data.data.report;
};

/**
 * Fetch hire/fire report.
 *
 * Backend route:
 * GET /api/reports/hire-fire
 */
export const getHireFireReport = async (
  params?: ReportQuery
): Promise<HireFireReport> => {
  const response = await api.get<HireFireReportResponse>(
    "/reports/hire-fire",
    {
      params: cleanParams(params),
    }
  );

  return response.data.data.report;
};