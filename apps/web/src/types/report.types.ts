export type ReportType = "attendance" | "tasks" | "employees" | "hire_fire";

export type ReportQuery = {
  fromDate?: string;
  toDate?: string;
  status?: string;
  type?: "HIRED" | "TERMINATED" | "ALL";
};

export type AttendanceReportRecord = {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
  lateMinutes: number;
  workingMinutes: number;
  checkInAddress?: string | null;
  checkOutAddress?: string | null;
  user: {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string;
    mobile?: string;
    status?: string;
    department: {
      id?: string;
      name: string;
    } | null;
    designation: {
      id?: string;
      name: string;
    } | null;
    manager?: {
      id: string;
      fullName: string;
      employeeCode: string;
    } | null;
  };
};

export type AttendanceReport = {
  summary: {
    totalRecords: number;
    present: number;
    late: number;
    absent: number;
    halfDay: number;
    totalWorkingMinutes: number;
  };
  records: AttendanceReportRecord[];
};

export type TaskReportRecord = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    status: string;
  } | null;
  assignedTo: {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string;
    department: {
      id?: string;
      name: string;
    } | null;
    designation: {
      id?: string;
      name: string;
    } | null;
  };
  createdBy: {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string;
  };
  _count?: {
    comments?: number;
  };
};

export type TaskReport = {
  summary: {
    totalTasks: number;
    pending: number;
    inProgress: number;
    inReview: number;
    completed: number;
    cancelled: number;
    overdue: number;
  };
  records: TaskReportRecord[];
};

export type EmployeeReportRecord = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  mobile: string;
  status: string;
  dateOfJoining: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  createdAt: string;
  role: {
    id: string;
    name: string;
  };
  department: {
    id: string;
    name: string;
  } | null;
  designation: {
    id: string;
    name: string;
  } | null;
  manager: {
    id: string;
    employeeCode: string;
    fullName: string;
  } | null;
};

export type EmployeeReport = {
  summary: {
    totalEmployees: number;
    active: number;
    inactive: number;
    terminated: number;
    onNotice: number;
  };
  records: EmployeeReportRecord[];
};

export type HireFireEmployeeRecord = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  mobile: string;
  status: string;
  dateOfJoining: string | null;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  createdAt?: string;
  department: {
    id: string;
    name: string;
  } | null;
  designation: {
    id: string;
    name: string;
  } | null;
  role: {
    name: string;
  };
};

export type HireFireReport = {
  summary: {
    totalHired: number;
    totalTerminated: number;
  };
  records: {
    hired: HireFireEmployeeRecord[];
    terminated: HireFireEmployeeRecord[];
  };
};

export type AttendanceReportResponse = {
  success: boolean;
  message: string;
  data: {
    report: AttendanceReport;
  };
};

export type TaskReportResponse = {
  success: boolean;
  message: string;
  data: {
    report: TaskReport;
  };
};

export type EmployeeReportResponse = {
  success: boolean;
  message: string;
  data: {
    report: EmployeeReport;
  };
};

export type HireFireReportResponse = {
  success: boolean;
  message: string;
  data: {
    report: HireFireReport;
  };
};