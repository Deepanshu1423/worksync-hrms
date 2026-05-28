import { Request, Response } from "express";
import { getAdminDashboardService } from "./dashboard.service";

/**
 * Admin dashboard controller.
 *
 * This returns real HRMS dashboard analytics:
 * - employees
 * - attendance
 * - projects
 * - tasks
 * - recent records
 */
export const getAdminDashboardController = async (
  req: Request,
  res: Response
) => {
  try {
    const dashboard = await getAdminDashboardService();

    return res.status(200).json({
      success: true,
      message: "Admin dashboard fetched successfully",
      data: {
        dashboard,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch admin dashboard",
    });
  }
};