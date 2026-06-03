export type AttendanceUser = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  mobile?: string;
  department: {
    id?: string;
    name: string;
  } | null;
  designation: {
    id?: string;
    name: string;
  } | null;
};

export type AttendancePhoto = {
  id?: string;
  fileName?: string;
  fileUrl?: string;
  publicId?: string;
};

export type AttendanceRecord = {
  id: string;
  date: string;

  checkInAt: string | null;
  checkOutAt: string | null;

  status: string;
  lateMinutes: number;
  workingMinutes: number;

  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkInAccuracy?: number | null;
  checkInAddress?: string | null;

  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checkOutAccuracy?: number | null;
  checkOutAddress?: string | null;

  checkInPhoto?: AttendancePhoto | null;
  checkOutPhoto?: AttendancePhoto | null;

  createdAt?: string;
  updatedAt?: string;

  user: AttendanceUser;
};

export type AdminAttendanceResponse = {
  success: boolean;
  message: string;
  data: {
    attendanceRecords: AttendanceRecord[];
  };
};