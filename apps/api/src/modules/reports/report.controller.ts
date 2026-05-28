import { Request, Response } from "express";
import {
  attendanceReportQuerySchema,
  employeeReportQuerySchema,
  hireFireReportQuerySchema,
  taskReportQuerySchema,
} from "./report.validation";
import {
  getAttendanceReportService,
  getEmployeeReportService,
  getHireFireReportService,
  getTaskReportService,
} from "./report.service";

/**
 * Attendance report controller.
 */
export const getAttendanceReportController = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedQuery = attendanceReportQuerySchema.parse(req.query);

    const report = await getAttendanceReportService(validatedQuery);

    return res.status(200).json({
      success: true,
      message: "Attendance report fetched successfully",
      data: {
        report,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch attendance report",
    });
  }
};

/**
 * Task report controller.
 */
export const getTaskReportController = async (req: Request, res: Response) => {
  try {
    const validatedQuery = taskReportQuerySchema.parse(req.query);

    const report = await getTaskReportService(validatedQuery);

    return res.status(200).json({
      success: true,
      message: "Task report fetched successfully",
      data: {
        report,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch task report",
    });
  }
};

/**
 * Employee report controller.
 */
export const getEmployeeReportController = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedQuery = employeeReportQuerySchema.parse(req.query);

    const report = await getEmployeeReportService(validatedQuery);

    return res.status(200).json({
      success: true,
      message: "Employee report fetched successfully",
      data: {
        report,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch employee report",
    });
  }
};

/**
 * Hire / Fire report controller.
 */
export const getHireFireReportController = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedQuery = hireFireReportQuerySchema.parse(req.query);

    const report = await getHireFireReportService(validatedQuery);

    return res.status(200).json({
      success: true,
      message: "Hire/Fire report fetched successfully",
      data: {
        report,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch hire/fire report",
    });
  }
};