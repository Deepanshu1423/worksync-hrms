import { Request, Response } from "express";
import {
  attendanceAdminQuerySchema,
  attendanceTeamQuerySchema,
  attendanceLocationSchema,
} from "./attendance.validation";
import {
  checkInService,
  checkOutService,
  getAdminAttendanceService,
  getMyAttendanceHistoryService,
  getManagerTeamAttendanceService,
} from "./attendance.service";

/**
 * Gets IP address from request.
 * x-forwarded-for is useful when API is deployed behind proxy/load balancer.
 */
const getRequestIpAddress = (req: Request) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0];
  }

  return req.ip;
};

/**
 * Gets browser/device info from user-agent header.
 */
const getRequestDevice = (req: Request) => {
  return req.headers["user-agent"] || "Unknown device";
};

export const checkInController = async (req: Request, res: Response) => {
  try {
    const validatedData = attendanceLocationSchema.parse(req.body);

    const attendance = await checkInService(
      req.user?.id as string,
      validatedData,
      {
        ipAddress: getRequestIpAddress(req),
        device: getRequestDevice(req),
      },
      req.file
    );

    return res.status(201).json({
      success: true,
      message: "Check-in successful",
      data: {
        attendance,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to check in",
    });
  }
};

export const checkOutController = async (req: Request, res: Response) => {
  try {
    const validatedData = attendanceLocationSchema.parse(req.body);

    const attendance = await checkOutService(
      req.user?.id as string,
      validatedData,
      {
        ipAddress: getRequestIpAddress(req),
        device: getRequestDevice(req),
      },
      req.file
    );

    return res.status(200).json({
      success: true,
      message: "Check-out successful",
      data: {
        attendance,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to check out",
    });
  }
};

export const getMyAttendanceHistoryController = async (
  req: Request,
  res: Response
) => {
  try {
    const attendanceHistory = await getMyAttendanceHistoryService(
      req.user?.id as string
    );

    return res.status(200).json({
      success: true,
      message: "Attendance history fetched successfully",
      data: {
        attendanceHistory,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch attendance history",
    });
  }
};

export const getAdminAttendanceController = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedQuery = attendanceAdminQuerySchema.parse(req.query);

    const attendanceRecords = await getAdminAttendanceService(validatedQuery);

    return res.status(200).json({
      success: true,
      message: "Attendance records fetched successfully",
      data: {
        attendanceRecords,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch attendance records",
    });
  }
};

/**
 * Manager can view attendance records of only their assigned team members.
 * This keeps employee data secure and role-based.
 */
export const getManagerTeamAttendanceController = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedQuery = attendanceTeamQuerySchema.parse(req.query);

    const attendanceRecords = await getManagerTeamAttendanceService(
      req.user?.id as string,
      validatedQuery
    );

    return res.status(200).json({
      success: true,
      message: "Team attendance records fetched successfully",
      data: {
        attendanceRecords,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch team attendance records",
    });
  }
};