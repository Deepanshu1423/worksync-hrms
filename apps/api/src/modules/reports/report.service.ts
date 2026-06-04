import { prisma } from "../../database/prisma";
import {
  AttendanceStatus,
  TaskStatus,
  UserStatus,
} from "../../generated/prisma/client";
import {
  AttendanceReportQueryInput,
  EmployeeReportQueryInput,
  HireFireReportQueryInput,
  TaskReportQueryInput,
} from "./report.validation";

/**
 * Converts date string to start of day.
 * Example: 2026-05-01 → 2026-05-01 00:00:00
 */
const getDateStart = (dateValue: string) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Converts date string to end of day.
 * Example: 2026-05-01 → 2026-05-01 23:59:59
 */
const getDateEnd = (dateValue: string) => {
  const date = new Date(dateValue);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Creates reusable date range condition for Prisma queries.
 */
const buildDateRangeCondition = (fromDate?: string, toDate?: string) => {
  if (!fromDate && !toDate) {
    return undefined;
  }

  const condition: any = {};

  if (fromDate) {
    condition.gte = getDateStart(fromDate);
  }

  if (toDate) {
    condition.lte = getDateEnd(toDate);
  }

  return condition;
};

/**
 * Attendance Report Service.
 *
 * This report is for HR/Admin attendance monitoring.
 * It includes employee details, check-in/check-out time, status, working minutes,
 * late minutes, and location coordinates.
 */
export const getAttendanceReportService = async (
  query: AttendanceReportQueryInput,
) => {
  const whereCondition: any = {};

  const dateCondition = buildDateRangeCondition(query.fromDate, query.toDate);

  if (dateCondition) {
    whereCondition.date = dateCondition;
  }

  if (query.userId) {
    whereCondition.userId = query.userId;
  }

  if (query.status) {
    whereCondition.status = query.status;
  }

  if (query.departmentId) {
    whereCondition.user = {
      departmentId: query.departmentId,
    };
  }

  const records = await prisma.attendanceRecord.findMany({
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

  const summary = {
    totalRecords: records.length,
    present: records.filter(
      (record) => record.status === AttendanceStatus.PRESENT,
    ).length,
    late: records.filter((record) => record.status === AttendanceStatus.LATE)
      .length,
    absent: records.filter(
      (record) => record.status === AttendanceStatus.ABSENT,
    ).length,
    halfDay: records.filter(
      (record) => record.status === AttendanceStatus.HALF_DAY,
    ).length,
    totalWorkingMinutes: records.reduce(
      (sum, record) => sum + record.workingMinutes,
      0,
    ),
  };

  return {
    summary,
    records,
  };
};

/**
 * Task Report Service.
 *
 * This report is for Admin/HR task tracking.
 * It includes task status, priority, project, assigned employee, creator, and due date.
 */
export const getTaskReportService = async (query: TaskReportQueryInput) => {
  const whereCondition: any = {};

  const createdAtCondition = buildDateRangeCondition(
    query.fromDate,
    query.toDate,
  );

  if (createdAtCondition) {
    whereCondition.createdAt = createdAtCondition;
  }

  if (query.projectId) {
    whereCondition.projectId = query.projectId;
  }

  if (query.assignedToId) {
    whereCondition.assignedToId = query.assignedToId;
  }

  if (query.status) {
    whereCondition.status = query.status;
  }

  if (query.priority) {
    whereCondition.priority = query.priority;
  }

  const records = await prisma.task.findMany({
    where: whereCondition,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
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
      createdBy: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
        },
      },
      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  const now = new Date();

  const summary = {
    totalTasks: records.length,
    pending: records.filter((task) => task.status === TaskStatus.PENDING)
      .length,
    inProgress: records.filter((task) => task.status === TaskStatus.IN_PROGRESS)
      .length,
    inReview: records.filter((task) => task.status === TaskStatus.IN_REVIEW)
      .length,
    completed: records.filter((task) => task.status === TaskStatus.COMPLETED)
      .length,
    cancelled: records.filter((task) => task.status === TaskStatus.CANCELLED)
      .length,
    overdue: records.filter(
      (task) =>
        task.dueDate &&
        task.dueDate < now &&
        task.status !== TaskStatus.COMPLETED &&
        task.status !== TaskStatus.CANCELLED,
    ).length,
  };

  return {
    summary,
    records,
  };
};

/**
 * Employee Report Service.
 *
 * This report is for employee master data.
 * It supports filters by role, department, designation, and status.
 */
export const getEmployeeReportService = async (
  query: EmployeeReportQueryInput,
) => {
  const whereCondition: any = {
    deletedAt: null,
    role: {
      name: {
        not: "SUPER_ADMIN",
      },
    },
  };

  if (query.roleId) {
    whereCondition.roleId = query.roleId;
  }

  if (query.departmentId) {
    whereCondition.departmentId = query.departmentId;
  }

  if (query.designationId) {
    whereCondition.designationId = query.designationId;
  }

  if (query.status) {
    whereCondition.status = query.status;
  }

  const records = await prisma.user.findMany({
    where: whereCondition,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      email: true,
      mobile: true,
      status: true,
      dateOfJoining: true,
      terminatedAt: true,
      terminationReason: true,
      createdAt: true,
      role: {
        select: {
          id: true,
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
          employeeCode: true,
          fullName: true,
        },
      },
    },
  });

  const summary = {
    totalEmployees: records.length,
    active: records.filter((employee) => employee.status === UserStatus.ACTIVE)
      .length,
    inactive: records.filter(
      (employee) => employee.status === UserStatus.INACTIVE,
    ).length,
    terminated: records.filter(
      (employee) => employee.status === UserStatus.TERMINATED,
    ).length,
    onNotice: records.filter(
      (employee) => employee.status === UserStatus.ON_NOTICE,
    ).length,
  };

  return {
    summary,
    records,
  };
};

/**
 * Hire / Fire Report Service.
 *
 * This report helps Admin/HR track:
 * - recently hired employees
 * - terminated employees
 * - termination reasons
 * - date-wise employee lifecycle changes
 */
export const getHireFireReportService = async (
  query: HireFireReportQueryInput,
) => {
  const type = query.type || "ALL";

  const dateCondition = buildDateRangeCondition(query.fromDate, query.toDate);

  const employeeBaseWhere: any = {
    deletedAt: null,
    role: {
      name: {
        not: "SUPER_ADMIN",
      },
    },
  };

  if (query.departmentId) {
    employeeBaseWhere.departmentId = query.departmentId;
  }

  const hiredRecords =
    type === "HIRED" || type === "ALL"
      ? await prisma.user.findMany({
          where: {
            ...employeeBaseWhere,
            ...(dateCondition
              ? {
                  dateOfJoining: dateCondition,
                }
              : {}),
          },
          orderBy: {
            dateOfJoining: "desc",
          },
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            email: true,
            mobile: true,
            status: true,
            dateOfJoining: true,
            createdAt: true,
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
            role: {
              select: {
                name: true,
              },
            },
          },
        })
      : [];

  const terminatedRecords =
    type === "TERMINATED" || type === "ALL"
      ? await prisma.user.findMany({
          where: {
            ...employeeBaseWhere,
            status: UserStatus.TERMINATED,
            ...(dateCondition
              ? {
                  terminatedAt: dateCondition,
                }
              : {}),
          },
          orderBy: {
            terminatedAt: "desc",
          },
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            email: true,
            mobile: true,
            status: true,
            dateOfJoining: true,
            terminatedAt: true,
            terminationReason: true,
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
            role: {
              select: {
                name: true,
              },
            },
          },
        })
      : [];

  return {
    summary: {
      totalHired: hiredRecords.length,
      totalTerminated: terminatedRecords.length,
    },
    records: {
      hired: hiredRecords,
      terminated: terminatedRecords,
    },
  };
};
