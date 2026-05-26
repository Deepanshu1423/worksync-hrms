import { Request, Response } from "express";

export const getAdminDashboardController = async (
  req: Request,
  res: Response
) => {
  return res.status(200).json({
    success: true,
    message: "Admin dashboard access granted",
    data: {
      user: req.user,
      stats: {
        totalEmployees: 0,
        activeEmployees: 0,
        todayPresent: 0,
        pendingTasks: 0,
      },
    },
  });
};