import { api } from "./api.service";
import {
  AdminDashboard,
  AdminDashboardResponse,
} from "@/types/dashboard.types";

/**
 * Fetches Admin/HR dashboard analytics from backend.
 *
 * Backend route:
 * GET /api/dashboard/admin
 */
export const getAdminDashboard = async (): Promise<AdminDashboard> => {
  const response = await api.get<AdminDashboardResponse>("/dashboard/admin");

  /**
   * Expected backend response:
   * {
   *   success: true,
   *   message: "...",
   *   data: {
   *     dashboard: { ... }
   *   }
   * }
   */
  return response.data.data.dashboard;
};