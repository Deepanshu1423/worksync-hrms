import { prisma } from "../../database/prisma";
import { AttendanceStatus, UserStatus } from "../../generated/prisma/client";
import { calculateDistanceInMeters } from "../../shared/helpers/geo.helper";
import { createFileAssetFromUpload } from "../files/fileUpload.service";
import {
  AttendanceAdminQueryInput,
  AttendanceLocationInput,
  AttendanceTeamQueryInput,
} from "./attendance.validation";

/**
 * Returns today's date with time set to 00:00:00.
 * This is used to keep one attendance record per employee per day.
 */
const getTodayStartDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Converts a date string into start of day.
 * Used for date-based filters in Admin/Manager attendance reports.
 */
const getDateStart = (dateValue: string) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Converts a date string into end of day.
 * Used to fetch records for a complete selected date.
 */
const getDateEnd = (dateValue: string) => {
  const date = new Date(dateValue);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Calculates late minutes according to company office timing.
 *
 * These values come from .env:
 * OFFICE_START_HOUR=10
 * OFFICE_START_MINUTE=0
 * LATE_GRACE_MINUTES=15
 *
 * Example:
 * Office starts at 10:00 AM
 * Grace time is 15 minutes
 * Employee is late after 10:15 AM
 */
const calculateLateMinutes = (checkInAt: Date) => {
  const officeStartHour = Number(process.env.OFFICE_START_HOUR || 10);
  const officeStartMinute = Number(process.env.OFFICE_START_MINUTE || 0);
  const lateGraceMinutes = Number(process.env.LATE_GRACE_MINUTES || 15);

  const allowedCheckInTime = new Date(checkInAt);
  allowedCheckInTime.setHours(
    officeStartHour,
    officeStartMinute + lateGraceMinutes,
    0,
    0
  );

  if (checkInAt <= allowedCheckInTime) {
    return 0;
  }

  const differenceInMs = checkInAt.getTime() - allowedCheckInTime.getTime();

  return Math.ceil(differenceInMs / (1000 * 60));
};

/**
 * Fetches active office location for geo attendance.
 *
 * Current logic:
 * - Uses latest active office location.
 *
 * Future improvement:
 * - Assign employee to a specific office location.
 * - Then validate attendance against that assigned office only.
 */
const getActiveOfficeLocation = async () => {
  return prisma.officeLocation.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Validates whether the logged-in user is active and allowed to mark attendance.
 *
 * Terminated, inactive, or deleted employees cannot mark attendance.
 */
const validateEmployeeForAttendance = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    include: {
      role: true,
    },
  });

  if (!user) {
    throw new Error("Employee not found");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new Error("Only active employees can mark attendance");
  }

  return user;
};

/**
 * Validates whether employee is inside the allowed office radius.
 *
 * Flow:
 * 1. Fetch active office location.
 * 2. Calculate distance between employee location and office location.
 * 3. If distance is greater than allowed radius, block attendance.
 *
 * If no active office location exists, attendance is allowed.
 * This keeps development/testing flexible.
 */
const validateOfficeRadius = async (location: AttendanceLocationInput) => {
  const officeLocation = await getActiveOfficeLocation();

  if (!officeLocation) {
    return {
      officeLocation: null,
      distanceInMeters: null,
    };
  }

  const distanceInMeters = calculateDistanceInMeters(
    location.latitude,
    location.longitude,
    Number(officeLocation.latitude),
    Number(officeLocation.longitude)
  );

  if (distanceInMeters > officeLocation.allowedRadius) {
    throw new Error(
      `You are outside the allowed office radius. Distance: ${distanceInMeters} meters`
    );
  }

  return {
    officeLocation,
    distanceInMeters,
  };
};

/**
 * Common user selection object for attendance responses.
 * This keeps employee details consistent in check-in/check-out response.
 */
const attendanceUserInclude = {
  user: {
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      email: true,
      role: {
        select: {
          name: true,
        },
      },
      department: {
        select: {
          name: true,
        },
      },
      designation: {
        select: {
          name: true,
        },
      },
    },
  },
};

/**
 * Fetches attendance photo details from file_assets table.
 *
 * Why this helper is needed:
 * - attendance_records table stores only photo IDs.
 * - file_assets table stores actual file URL.
 * - Frontend needs fileUrl to show View Photo button.
 */
const attachAttendancePhotos = async (attendanceRecords: any[]) => {
  const photoIds = attendanceRecords
    .flatMap((record) => [record.checkInPhotoId, record.checkOutPhotoId])
    .filter(Boolean);

  if (photoIds.length === 0) {
    return attendanceRecords.map((record) => ({
      ...record,
      checkInPhoto: null,
      checkOutPhoto: null,
    }));
  }

  const photoAssets = await prisma.fileAsset.findMany({
    where: {
      id: {
        in: photoIds,
      },
    },
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      fileType: true,
      fileSize: true,
      publicId: true,
      relatedType: true,
      relatedId: true,
      createdAt: true,
    },
  });

  const photoMap = new Map(photoAssets.map((photo) => [photo.id, photo]));

  return attendanceRecords.map((record) => ({
    ...record,
    checkInPhoto: record.checkInPhotoId
      ? photoMap.get(record.checkInPhotoId) || null
      : null,
    checkOutPhoto: record.checkOutPhotoId
      ? photoMap.get(record.checkOutPhotoId) || null
      : null,
  }));
};

/**
 * Employee Check-in Service.
 *
 * This service:
 * - validates employee status
 * - validates office radius
 * - prevents duplicate check-in
 * - saves server check-in time
 * - calculates late minutes
 * - saves location, IP, device info
 * - uploads optional selfie photo to Cloudinary
 * - saves photo reference in attendance record
 */
export const checkInService = async (
  userId: string,
  data: AttendanceLocationInput,
  meta: {
    ipAddress?: string;
    device?: string;
  },
  photoFile?: Express.Multer.File
) => {
  await validateEmployeeForAttendance(userId);
  await validateOfficeRadius(data);

  const todayDate = getTodayStartDate();

  const existingAttendance = await prisma.attendanceRecord.findUnique({
    where: {
      userId_date: {
        userId,
        date: todayDate,
      },
    },
  });

  if (existingAttendance?.checkInAt) {
    throw new Error("You have already checked in today");
  }

  const checkInAt = new Date();
  const lateMinutes = calculateLateMinutes(checkInAt);

  const status =
    lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

  /**
   * First create attendance record without photo.
   * After creating attendance, we get attendance.id.
   * Then we upload photo and link it with attendance.id.
   */
  const attendance = await prisma.attendanceRecord.create({
    data: {
      userId,
      date: todayDate,
      checkInAt,
      status,
      lateMinutes,
      checkInLatitude: data.latitude,
      checkInLongitude: data.longitude,
      checkInAccuracy: data.accuracy || null,
      checkInAddress: data.address || null,
      checkInIpAddress: meta.ipAddress || null,
      checkInDevice: meta.device || null,
    },
  });

  let checkInPhoto = null;

  /**
   * If photo is sent, upload to Cloudinary and save metadata in file_assets.
   */
  if (photoFile) {
    checkInPhoto = await createFileAssetFromUpload({
      file: photoFile,
      uploadedById: userId,
      relatedType: "ATTENDANCE_CHECK_IN",
      relatedId: attendance.id,
      folder: "worksync-hrms/attendance/check-in",
    });

    await prisma.attendanceRecord.update({
      where: {
        id: attendance.id,
      },
      data: {
        checkInPhotoId: checkInPhoto.id,
      },
    });
  }

  const finalAttendance = await prisma.attendanceRecord.findUnique({
    where: {
      id: attendance.id,
    },
    include: attendanceUserInclude,
  });

  if (!finalAttendance) {
    throw new Error("Attendance record not found after check-in");
  }

  return {
    ...finalAttendance,
    checkInPhoto,
  };
};

/**
 * Employee Check-out Service.
 *
 * This service:
 * - validates employee status
 * - validates office radius
 * - checks if employee already checked in
 * - prevents duplicate check-out
 * - saves server check-out time
 * - calculates working minutes
 * - saves location, IP, device info
 * - uploads optional check-out selfie photo
 */
export const checkOutService = async (
  userId: string,
  data: AttendanceLocationInput,
  meta: {
    ipAddress?: string;
    device?: string;
  },
  photoFile?: Express.Multer.File
) => {
  await validateEmployeeForAttendance(userId);
  await validateOfficeRadius(data);

  const todayDate = getTodayStartDate();

  const attendance = await prisma.attendanceRecord.findUnique({
    where: {
      userId_date: {
        userId,
        date: todayDate,
      },
    },
  });

  if (!attendance || !attendance.checkInAt) {
    throw new Error("Please check in first before check-out");
  }

  if (attendance.checkOutAt) {
    throw new Error("You have already checked out today");
  }

  const checkOutAt = new Date();

  const workingMinutes = Math.max(
    0,
    Math.round(
      (checkOutAt.getTime() - attendance.checkInAt.getTime()) / (1000 * 60)
    )
  );

  const updatedAttendance = await prisma.attendanceRecord.update({
    where: {
      id: attendance.id,
    },
    data: {
      checkOutAt,
      workingMinutes,
      checkOutLatitude: data.latitude,
      checkOutLongitude: data.longitude,
      checkOutAccuracy: data.accuracy || null,
      checkOutAddress: data.address || null,
      checkOutIpAddress: meta.ipAddress || null,
      checkOutDevice: meta.device || null,
    },
  });

  let checkOutPhoto = null;

  /**
   * If photo is sent, upload to Cloudinary and link with attendance record.
   */
  if (photoFile) {
    checkOutPhoto = await createFileAssetFromUpload({
      file: photoFile,
      uploadedById: userId,
      relatedType: "ATTENDANCE_CHECK_OUT",
      relatedId: updatedAttendance.id,
      folder: "worksync-hrms/attendance/check-out",
    });

    await prisma.attendanceRecord.update({
      where: {
        id: updatedAttendance.id,
      },
      data: {
        checkOutPhotoId: checkOutPhoto.id,
      },
    });
  }

  const finalAttendance = await prisma.attendanceRecord.findUnique({
    where: {
      id: updatedAttendance.id,
    },
    include: attendanceUserInclude,
  });

  if (!finalAttendance) {
    throw new Error("Attendance record not found after check-out");
  }

  return {
    ...finalAttendance,
    checkOutPhoto,
  };
};

/**
 * Logged-in user's own attendance history.
 *
 * Used by:
 * - Employee dashboard
 * - Manager dashboard for own attendance
 * - Admin/HR own attendance if needed
 */
export const getMyAttendanceHistoryService = async (userId: string) => {
  const attendanceHistory = await prisma.attendanceRecord.findMany({
    where: {
      userId,
    },
    orderBy: {
      date: "desc",
    },
  });

  return attachAttendancePhotos(attendanceHistory);
};

/**
 * Admin/HR Attendance View.
 *
 * Admin/HR can filter attendance by:
 * - date
 * - employee
 * - department
 * - attendance status
 *
 * This API returns all employees' attendance records.
 */
export const getAdminAttendanceService = async (
  query: AttendanceAdminQueryInput
) => {
  const whereCondition: any = {};

  /**
   * Optional date filter.
   * Example:
   * /api/attendance/admin?date=2026-05-26
   */
  if (query.date) {
    whereCondition.date = {
      gte: getDateStart(query.date),
      lte: getDateEnd(query.date),
    };
  }

  /**
   * Optional employee filter.
   */
  if (query.userId) {
    whereCondition.userId = query.userId;
  }

  /**
   * Optional attendance status filter.
   * Values:
   * PRESENT, LATE, ABSENT, HALF_DAY
   */
  if (query.status) {
    whereCondition.status = query.status;
  }

  /**
   * Optional department filter.
   * This filters attendance by employee department.
   */
  if (query.departmentId) {
    whereCondition.user = {
      departmentId: query.departmentId,
    };
  }

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: whereCondition,
    orderBy: {
      date: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
          mobile: true,
          status: true,
          role: {
            select: {
              name: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          designation: {
            select: {
              id: true,
              name: true,
            },
          },
          manager: {
            select: {
              id: true,
              fullName: true,
              employeeCode: true,
            },
          },
        },
      },
    },
  });

  return attachAttendancePhotos(attendanceRecords);
};

/**
 * Manager Team Attendance View.
 *
 * Manager can view only those employees whose managerId is equal to logged-in manager's id.
 *
 * This protects company-wide employee data from being visible to every manager.
 */
export const getManagerTeamAttendanceService = async (
  managerId: string,
  query: AttendanceTeamQueryInput
) => {
  const whereCondition: any = {
    user: {
      managerId,
      deletedAt: null,
    },
  };

  /**
   * Optional date filter.
   * Example:
   * /api/attendance/team?date=2026-05-26
   */
  if (query.date) {
    whereCondition.date = {
      gte: getDateStart(query.date),
      lte: getDateEnd(query.date),
    };
  }

  /**
   * Optional attendance status filter.
   * Values:
   * PRESENT, LATE, ABSENT, HALF_DAY
   */
  if (query.status) {
    whereCondition.status = query.status;
  }

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: whereCondition,
    orderBy: {
      date: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
          mobile: true,
          status: true,
          role: {
            select: {
              name: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          designation: {
            select: {
              id: true,
              name: true,
            },
          },
          manager: {
            select: {
              id: true,
              fullName: true,
              employeeCode: true,
            },
          },
        },
      },
    },
  });

  return attachAttendancePhotos(attendanceRecords);
};