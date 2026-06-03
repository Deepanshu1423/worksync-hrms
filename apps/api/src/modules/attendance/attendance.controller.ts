import { Request, Response } from "express";
import {
  attendanceAdminQuerySchema,
  attendanceTeamQuerySchema,
  attendanceLocationSchema,
} from "./attendance.validation";
import {
  checkInAttendanceService,
  checkOutAttendanceService,
  getAdminAttendanceRecordsService,
  getMyTodayAttendanceService,
} from "./attendance.service";

/**
 * Gets IP address from request.
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

/**
 * Employee check-in.
 *
 * POST /api/attendance/check-in
 */
export const checkInController = async (req: Request, res: Response) => {
  try {
    const validatedData = attendanceLocationSchema.parse(req.body);

    const attendanceRecord = await checkInAttendanceService(
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
        attendance: attendanceRecord,
        attendanceRecord,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to check in",
    });
  }
};

/**
 * Employee check-out.
 *
 * POST /api/attendance/check-out
 */
export const checkOutController = async (req: Request, res: Response) => {
  try {
    const validatedData = attendanceLocationSchema.parse(req.body);

    const attendanceRecord = await checkOutAttendanceService(
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
        attendance: attendanceRecord,
        attendanceRecord,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to check out",
    });
  }
};

/**
 * Logged-in user today's attendance.
 *
 * GET /api/attendance/my-today
 */
export const getMyTodayAttendanceController = async (
  req: Request,
  res: Response
) => {
  try {
    const attendanceRecord = await getMyTodayAttendanceService(
      req.user?.id as string
    );

    return res.status(200).json({
      success: true,
      message: "Today's attendance fetched successfully",
      data: {
        attendanceRecord,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch today's attendance",
    });
  }
};

/**
 * Logged-in user attendance history.
 *
 * GET /api/attendance/my-history
 */
export const getMyAttendanceHistoryController = async (
  req: Request,
  res: Response
) => {
  try {
    const allAttendanceRecords = await getAdminAttendanceRecordsService();

    const attendanceHistory = allAttendanceRecords.filter(
      (record: any) => record.user?.id === req.user?.id
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

/**
 * Admin attendance list.
 *
 * GET /api/attendance/admin
 */
export const getAdminAttendanceController = async (
  req: Request,
  res: Response
) => {
  try {
    attendanceAdminQuerySchema.parse(req.query);

    const attendanceRecords = await getAdminAttendanceRecordsService();

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
 * Manager team attendance list.
 *
 * GET /api/attendance/team
 */
export const getManagerTeamAttendanceController = async (
  req: Request,
  res: Response
) => {
  try {
    attendanceTeamQuerySchema.parse(req.query);

    return res.status(200).json({
      success: true,
      message: "Team attendance records fetched successfully",
      data: {
        attendanceRecords: [],
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch team attendance records",
    });
  }
};