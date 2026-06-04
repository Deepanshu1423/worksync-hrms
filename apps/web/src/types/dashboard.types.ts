export type DashboardSummary = {
  totalEmployees?: number;
  activeEmployees?: number;
  inactiveEmployees?: number;
  terminatedEmployees?: number;

  managers?: number;
  totalManagers?: number;

  todayPresent?: number;
  todayAbsent?: number;
  todayLate?: number;
  todayCheckedIn?: number;
  todayCheckedOut?: number;

  presentToday?: number;
  absentToday?: number;
  lateToday?: number;
  checkedInToday?: number;
  checkedOutToday?: number;

  totalDepartments?: number;
  totalDesignations?: number;
  totalRoles?: number;

  totalProjects?: number;
  activeProjects?: number;
  completedProjects?: number;

  totalTasks?: number;
  pendingTasks?: number;
  inProgressTasks?: number;
  inReviewTasks?: number;
  completedTasks?: number;
  cancelledTasks?: number;
  overdueTasks?: number;

  [key: string]: number | undefined;
};

export type TaskStatusSummaryItem = {
  status: string;
  total?: number;
  count?: number;
};

export type DepartmentWiseEmployeeItem = {
  id?: string;
  name?: string;
  departmentName?: string;
  totalEmployees?: number;
  employeeCount?: number;
  count?: number;
};

export type RecentEmployeeItem = {
  id: string;
  fullName: string;
  employeeCode: string;
  email: string;
  status: string;
  role:
    | string
    | {
        id?: string;
        name?: string;
      };
};

export type RecentAttendanceItem = {
  id: string;
  status: string;
  checkInAt?: string | null;
  workingMinutes?: number | null;
  user: {
    id?: string;
    fullName: string;
    employeeCode?: string;
  };
};

export type RecentTaskItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedTo?: {
    id?: string;
    fullName?: string;
    employeeCode?: string;
  } | null;
};

export type AdminDashboard = {
  summary: DashboardSummary;

  charts: {
    taskStatusSummary: TaskStatusSummaryItem[];
    departmentWiseEmployees: DepartmentWiseEmployeeItem[];
  };

  recent: {
    recentEmployees: RecentEmployeeItem[];
    recentAttendance: RecentAttendanceItem[];
    recentTasks: RecentTaskItem[];
  };
};

export type AdminDashboardResponse = {
  success: boolean;
  message: string;
  data: {
    dashboard: AdminDashboard;
  };
};