import { prisma } from "../../database/prisma";
import { AttendanceStatus, TaskStatus, UserStatus } from "../../generated/prisma/client";

/**
 * Returns today's date start time.
 * Used for today's attendance calculations.
 */
const getTodayStartDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Returns today's date end time.
 * Used for today's attendance calculations.
 */
const getTodayEndDate = () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
};

/**
 * Admin Dashboard Analytics Service.
 *
 * This dashboard is HRMS-focused.
 * It does not track solar generation, electricity billing, or plant monitoring.
 * It only tracks employees, attendance, tasks, and internal work/projects.
 */
export const getAdminDashboardService = async () => {
  const todayStart = getTodayStartDate();
  const todayEnd = getTodayEndDate();
  const now = new Date();

  /**
   * Base employee condition:
   * - exclude deleted users
   * - exclude SUPER_ADMIN from employee analytics
   */
  const employeeWhereCondition = {
    deletedAt: null,
    role: {
      name: {
        not: "SUPER_ADMIN",
      },
    },
  };

  /**
   * Employee counts
   */
  const totalEmployees = await prisma.user.count({
    where: employeeWhereCondition,
  });

  const activeEmployees = await prisma.user.count({
    where: {
      ...employeeWhereCondition,
      status: UserStatus.ACTIVE,
    },
  });

  const terminatedEmployees = await prisma.user.count({
    where: {
      ...employeeWhereCondition,
      status: UserStatus.TERMINATED,
    },
  });

  /**
   * Today's attendance counts.
   */
  const todayAttendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
      user: employeeWhereCondition,
    },
    select: {
      id: true,
      status: true,
      userId: true,
      checkInAt: true,
      checkOutAt: true,
    },
  });

  const todayPresent = todayAttendanceRecords.filter(
    (record) =>
      record.status === AttendanceStatus.PRESENT ||
      record.status === AttendanceStatus.LATE
  ).length;

  const todayLate = todayAttendanceRecords.filter(
    (record) => record.status === AttendanceStatus.LATE
  ).length;

  /**
   * Absent employees = active employees - employees who checked in today.
   */
  const uniqueTodayAttendanceUserIds = new Set(
    todayAttendanceRecords.map((record) => record.userId)
  );

  const todayAbsent = Math.max(
    0,
    activeEmployees - uniqueTodayAttendanceUserIds.size
  );

  /**
   * Project counts
   */
  const totalProjects = await prisma.project.count();

  const activeProjects = await prisma.project.count({
    where: {
      status: "ACTIVE",
    },
  });

  /**
   * Task counts
   */
  const totalTasks = await prisma.task.count();

  const pendingTasks = await prisma.task.count({
    where: {
      status: TaskStatus.PENDING,
    },
  });

  const inProgressTasks = await prisma.task.count({
    where: {
      status: TaskStatus.IN_PROGRESS,
    },
  });

  const inReviewTasks = await prisma.task.count({
    where: {
      status: TaskStatus.IN_REVIEW,
    },
  });

  const completedTasks = await prisma.task.count({
    where: {
      status: TaskStatus.COMPLETED,
    },
  });

  const overdueTasks = await prisma.task.count({
    where: {
      dueDate: {
        lt: now,
      },
      status: {
        notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      },
    },
  });

  /**
   * Department-wise employee distribution.
   */
  const departmentStats = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          users: {
            where: {
              deletedAt: null,
              role: {
                name: {
                  not: "SUPER_ADMIN",
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const departmentWiseEmployees = departmentStats.map((department) => ({
    id: department.id,
    name: department.name,
    totalEmployees: department._count.users,
  }));

  /**
   * Task status distribution for chart.
   */
  const taskStatusSummary = [
    {
      status: "PENDING",
      total: pendingTasks,
    },
    {
      status: "IN_PROGRESS",
      total: inProgressTasks,
    },
    {
      status: "IN_REVIEW",
      total: inReviewTasks,
    },
    {
      status: "COMPLETED",
      total: completedTasks,
    },
  ];

  /**
   * Recent employees for dashboard table.
   */
  const recentEmployees = await prisma.user.findMany({
    where: employeeWhereCondition,
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      email: true,
      mobile: true,
      status: true,
      createdAt: true,
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
  });

  /**
   * Recent attendance for dashboard table.
   */
  const recentAttendance = await prisma.attendanceRecord.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    include: {
      user: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
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
    },
  });

  /**
   * Recent tasks for dashboard table.
   */
  const recentTasks = await prisma.task.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
        },
      },
    },
  });

  return {
    summary: {
      totalEmployees,
      activeEmployees,
      terminatedEmployees,
      todayPresent,
      todayAbsent,
      todayLate,
      totalProjects,
      activeProjects,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      inReviewTasks,
      completedTasks,
      overdueTasks,
    },
    charts: {
      departmentWiseEmployees,
      taskStatusSummary,
    },
    recent: {
      recentEmployees,
      recentAttendance,
      recentTasks,
    },
  };
};