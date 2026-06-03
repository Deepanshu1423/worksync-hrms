import { v2 as cloudinary } from "cloudinary";
import { prisma } from "../../database/prisma";
import {
  CheckInAttendanceInput,
  CheckOutAttendanceInput,
} from "./attendance.validation";

type AttendanceRequestInfo = {
  ipAddress?: string;
  device?: string;
};

type AttendancePhotoType = "ATTENDANCE_CHECK_IN" | "ATTENDANCE_CHECK_OUT";

/**
 * Returns today's date range.
 * Attendance is checked per day.
 */
const getTodayDateRange = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return {
    startOfDay,
    endOfDay,
  };
};

/**
 * Common include for attendance response.
 * Now checkInPhoto/checkOutPhoto work because relation is added in Prisma schema.
 */
const attendanceInclude = {
  user: {
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      email: true,
      mobile: true,
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
    },
  },
  checkInPhoto: true,
  checkOutPhoto: true,
};

/**
 * Formats attendance record response for frontend.
 */
const formatAttendanceRecord = (record: any) => {
  return {
    id: record.id,
    date: record.date,

    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,

    status: record.status,
    lateMinutes: record.lateMinutes || 0,
    workingMinutes: record.workingMinutes || 0,

    checkInLatitude: record.checkInLatitude,
    checkInLongitude: record.checkInLongitude,
    checkInAccuracy: record.checkInAccuracy,
    checkInAddress: record.checkInAddress,

    checkOutLatitude: record.checkOutLatitude,
    checkOutLongitude: record.checkOutLongitude,
    checkOutAccuracy: record.checkOutAccuracy,
    checkOutAddress: record.checkOutAddress,

    checkInPhoto: record.checkInPhoto || null,
    checkOutPhoto: record.checkOutPhoto || null,

    createdAt: record.createdAt,
    updatedAt: record.updatedAt,

    user: record.user
      ? {
          id: record.user.id,
          employeeCode: record.user.employeeCode,
          fullName: record.user.fullName,
          email: record.user.email,
          mobile: record.user.mobile,
          department: record.user.department,
          designation: record.user.designation,
        }
      : null,
  };
};

/**
 * Uploads multer memory file buffer to Cloudinary.
 */
const uploadAttendancePhotoToCloudinary = async (
  file: Express.Multer.File,
  folder: string
) => {
  return new Promise<{
    secure_url: string;
    public_id: string;
  }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Failed to upload attendance photo"));
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};

/**
 * Creates FileAsset record after Cloudinary upload.
 */
const createAttendancePhotoAsset = async ({
  userId,
  file,
  relatedType,
  relatedId,
}: {
  userId: string;
  file?: Express.Multer.File;
  relatedType: AttendancePhotoType;
  relatedId?: string | null;
}) => {
  if (!file) return null;

  const uploadedPhoto = await uploadAttendancePhotoToCloudinary(
    file,
    "worksync/attendance"
  );

  const fileAsset = await prisma.fileAsset.create({
    data: {
      uploadedById: userId,
      fileName: file.originalname || `attendance-${Date.now()}.jpg`,
      fileUrl: uploadedPhoto.secure_url,
      fileType: file.mimetype,
      fileSize: file.size,
      publicId: uploadedPhoto.public_id,
      relatedType,
      relatedId: relatedId || null,
    },
  });

  return fileAsset;
};

/**
 * Calculates working minutes between check-in and check-out.
 */
const calculateWorkingMinutes = (checkInAt: Date, checkOutAt: Date) => {
  const diffMs = checkOutAt.getTime() - checkInAt.getTime();

  if (diffMs <= 0) return 0;

  return Math.floor(diffMs / (1000 * 60));
};

/**
 * Calculates late minutes.
 * Default office start time: 10:00 AM.
 */
const calculateLateMinutes = (checkInAt: Date) => {
  const officeStartTime = new Date(checkInAt);
  officeStartTime.setHours(10, 0, 0, 0);

  if (checkInAt <= officeStartTime) return 0;

  const diffMs = checkInAt.getTime() - officeStartTime.getTime();

  return Math.floor(diffMs / (1000 * 60));
};

/**
 * Decides attendance status.
 */
const getAttendanceStatus = (lateMinutes: number) => {
  if (lateMinutes > 0) {
    return "LATE";
  }

  return "PRESENT";
};

/**
 * Get logged-in employee today's attendance.
 *
 * Backend route:
 * GET /api/attendance/my-today
 */
export const getMyTodayAttendanceService = async (userId: string) => {
  const { startOfDay, endOfDay } = getTodayDateRange();

  const attendanceRecord = await prisma.attendanceRecord.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: attendanceInclude,
  });

  if (!attendanceRecord) {
    return null;
  }

  return formatAttendanceRecord(attendanceRecord);
};

/**
 * Employee check-in.
 *
 * Employee can check-in from anywhere.
 * Actual location + photo proof will be saved for Admin/HR verification.
 */
export const checkInAttendanceService = async (
  userId: string,
  data: CheckInAttendanceInput,
  requestInfo: AttendanceRequestInfo,
  file?: Express.Multer.File
) => {
  const { startOfDay, endOfDay } = getTodayDateRange();

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const existingAttendance = await prisma.attendanceRecord.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (existingAttendance?.checkInAt) {
    throw new Error("You have already checked in today");
  }

  const checkInAt = new Date();
  const lateMinutes = calculateLateMinutes(checkInAt);
  const status = getAttendanceStatus(lateMinutes);

  /**
   * Upload photo first.
   * relatedId is updated after attendance record is created.
   */
  const checkInPhoto = await createAttendancePhotoAsset({
    userId,
    file,
    relatedType: "ATTENDANCE_CHECK_IN",
  });

  const attendanceRecord = await prisma.attendanceRecord.create({
    data: {
      userId,
      date: startOfDay,

      checkInAt,
      status,
      lateMinutes,

      checkInLatitude: data.latitude,
      checkInLongitude: data.longitude,
      checkInAccuracy:
        data.accuracy === null || data.accuracy === undefined
          ? null
          : Math.round(Number(data.accuracy)),
      checkInAddress: data.address ?? null,

      checkInPhotoId: checkInPhoto?.id ?? null,
      checkInIpAddress: requestInfo.ipAddress ?? null,
      checkInDevice: requestInfo.device ?? null,
    },
    include: attendanceInclude,
  });

  if (checkInPhoto) {
    await prisma.fileAsset.update({
      where: {
        id: checkInPhoto.id,
      },
      data: {
        relatedId: attendanceRecord.id,
      },
    });
  }

  return formatAttendanceRecord(attendanceRecord);
};

/**
 * Employee check-out.
 *
 * Employee can check-out from anywhere.
 * Actual checkout location + photo proof will be saved for Admin/HR verification.
 */
export const checkOutAttendanceService = async (
  userId: string,
  data: CheckOutAttendanceInput,
  requestInfo: AttendanceRequestInfo,
  file?: Express.Multer.File
) => {
  const { startOfDay, endOfDay } = getTodayDateRange();

  const attendanceRecord = await prisma.attendanceRecord.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (!attendanceRecord) {
    throw new Error("Please check in before checking out");
  }

  if (!attendanceRecord.checkInAt) {
    throw new Error("Please check in before checking out");
  }

  if (attendanceRecord.checkOutAt) {
    throw new Error("You have already checked out today");
  }

  const checkOutAt = new Date();

  const workingMinutes = calculateWorkingMinutes(
    attendanceRecord.checkInAt,
    checkOutAt
  );

  const checkOutPhoto = await createAttendancePhotoAsset({
    userId,
    file,
    relatedType: "ATTENDANCE_CHECK_OUT",
    relatedId: attendanceRecord.id,
  });

  const updatedAttendanceRecord = await prisma.attendanceRecord.update({
    where: {
      id: attendanceRecord.id,
    },
    data: {
      checkOutAt,
      workingMinutes,

      checkOutLatitude: data.latitude,
      checkOutLongitude: data.longitude,
      checkOutAccuracy:
        data.accuracy === null || data.accuracy === undefined
          ? null
          : Math.round(Number(data.accuracy)),
      checkOutAddress: data.address ?? null,

      checkOutPhotoId: checkOutPhoto?.id ?? null,
      checkOutIpAddress: requestInfo.ipAddress ?? null,
      checkOutDevice: requestInfo.device ?? null,
    },
    include: attendanceInclude,
  });

  return formatAttendanceRecord(updatedAttendanceRecord);
};

/**
 * Admin/HR attendance list.
 *
 * Backend route:
 * GET /api/attendance/admin
 */
export const getAdminAttendanceRecordsService = async () => {
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    orderBy: {
      date: "desc",
    },
    include: attendanceInclude,
  });

  return attendanceRecords.map((record) => formatAttendanceRecord(record));
};