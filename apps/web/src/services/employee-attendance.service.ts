import { api } from "./api.service";
import { AttendanceRecord } from "@/types/attendance.types";

type MyTodayAttendanceResponse = {
  success: boolean;
  message: string;
  data: {
    attendanceRecord: AttendanceRecord | null;
  };
};

type MyAttendanceHistoryResponse = {
  success: boolean;
  message: string;
  data: {
    attendanceHistory: AttendanceRecord[];
  };
};

type AttendanceActionResponse = {
  success: boolean;
  message: string;
  data: {
    attendanceRecord: AttendanceRecord;
  };
};

export type AttendanceActionPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  address?: string | null;
  photo?: File | null;
};

/**
 * Converts check-in / check-out payload into FormData.
 *
 * We use FormData because attendance may include photo proof.
 * Backend multer field name must be: photo
 */
function buildAttendanceFormData(payload: AttendanceActionPayload) {
  const formData = new FormData();

  formData.append("latitude", String(payload.latitude));
  formData.append("longitude", String(payload.longitude));

  if (payload.accuracy !== undefined && payload.accuracy !== null) {
    formData.append("accuracy", String(payload.accuracy));
  }

  if (payload.address) {
    formData.append("address", payload.address);
  }

  if (payload.photo) {
    formData.append("photo", payload.photo);
  }

  return formData;
}

/**
 * Fetch logged-in employee today's attendance.
 *
 * Backend route:
 * GET /api/attendance/my-today
 */
export const getMyTodayAttendance =
  async (): Promise<AttendanceRecord | null> => {
    const response = await api.get<MyTodayAttendanceResponse>(
      "/attendance/my-today"
    );

    return response.data.data.attendanceRecord;
  };

/**
 * Fetch logged-in employee attendance history.
 *
 * Backend route:
 * GET /api/attendance/my-history
 */
export const getMyAttendanceHistory =
  async (): Promise<AttendanceRecord[]> => {
    const response = await api.get<MyAttendanceHistoryResponse>(
      "/attendance/my-history"
    );

    return response.data.data.attendanceHistory;
  };

/**
 * Employee check-in with location and optional photo proof.
 *
 * Backend route:
 * POST /api/attendance/check-in
 */
export const checkInAttendance = async (
  payload: AttendanceActionPayload
): Promise<AttendanceRecord> => {
  const response = await api.post<AttendanceActionResponse>(
    "/attendance/check-in",
    buildAttendanceFormData(payload),
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.data.attendanceRecord;
};

/**
 * Employee check-out with location and optional photo proof.
 *
 * Backend route:
 * POST /api/attendance/check-out
 */
export const checkOutAttendance = async (
  payload: AttendanceActionPayload
): Promise<AttendanceRecord> => {
  const response = await api.post<AttendanceActionResponse>(
    "/attendance/check-out",
    buildAttendanceFormData(payload),
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.data.attendanceRecord;
};