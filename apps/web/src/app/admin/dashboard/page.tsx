"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserX,
  UsersRound,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getAdminDashboard } from "@/services/dashboard.service";
import type { AdminDashboard } from "@/types/dashboard.types";

type SummaryCardProps = {
  label: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

type ApiErrorResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
};

type SafeSummary = Record<string, unknown>;

type SafeTaskStatusSummaryItem = {
  status?: string | null;
  total?: number | string | null;
  count?: number | string | null;
};

type SafeDepartmentWiseEmployee = {
  id?: string | null;
  name?: string | null;
  departmentName?: string | null;
  totalEmployees?: number | string | null;
  employeeCount?: number | string | null;
  count?: number | string | null;
};

type SafeRole =
  | string
  | {
      name?: string | null;
    }
  | null
  | undefined;

type SafeRecentEmployee = {
  id?: string | null;
  fullName?: string | null;
  employeeCode?: string | null;
  email?: string | null;
  status?: string | null;
  role?: SafeRole;
};

type SafeRecentAttendance = {
  id?: string | null;
  status?: string | null;
  checkInAt?: string | Date | null;
  workingMinutes?: number | string | null;
  user?: {
    fullName?: string | null;
  } | null;
};

type SafeRecentTask = {
  id?: string | null;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  assignedTo?: {
    fullName?: string | null;
  } | null;
};

type SafeAdminDashboard = {
  summary?: SafeSummary;
  charts?: {
    taskStatusSummary?: SafeTaskStatusSummaryItem[];
    departmentWiseEmployees?: SafeDepartmentWiseEmployee[];
  };
  recent?: {
    recentEmployees?: SafeRecentEmployee[];
    recentAttendance?: SafeRecentAttendance[];
    recentTasks?: SafeRecentTask[];
  };
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  if (!error.response) {
    return "Backend server is not reachable. Please check if API server is running.";
  }

  const statusCode = error.response.status;
  const data = error.response.data;

  if (statusCode === 401) {
    return "Your session has expired. Please login again.";
  }

  if (statusCode === 403) {
    return "You do not have permission to view admin dashboard.";
  }

  if (statusCode === 404) {
    return "Admin dashboard API route not found.";
  }

  if (statusCode >= 500) {
    return "Server error while loading dashboard analytics.";
  }

  if (Array.isArray(data?.message)) {
    return data.message[0] || fallback;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.error === "string") {
    return data.error;
  }

  return fallback;
}

function getNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
}

function getTextValue(value: unknown, fallback = "—") {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function getRoleName(role: SafeRole) {
  if (typeof role === "string" && role.trim()) {
    return role;
  }

  if (role && typeof role === "object" && typeof role.name === "string") {
    return role.name;
  }

  return "—";
}

/**
 * Formats backend date/time into readable UI text.
 */
function formatDateTime(value?: unknown) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Formats large dashboard numbers.
 */
function formatNumber(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return new Intl.NumberFormat("en-IN").format(parsedValue);
    }

    return value;
  }

  return new Intl.NumberFormat("en-IN").format(getNumberValue(value));
}

/**
 * Gives badge color according to status.
 */
function getStatusBadgeClass(status: string) {
  if (["ACTIVE", "PRESENT", "COMPLETED"].includes(status)) {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (["LATE", "IN_PROGRESS", "IN_REVIEW"].includes(status)) {
    return "border-orange-300/20 bg-orange-300/10 text-orange-200";
  }

  if (["TERMINATED", "ABSENT", "CANCELLED"].includes(status)) {
    return "border-red-300/20 bg-red-300/10 text-red-200";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-100";
}

/**
 * Small reusable summary card for dashboard numbers.
 */
function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: SummaryCardProps) {
  const toneClasses = {
    default: "text-amber-300 bg-amber-300/10",
    success: "text-emerald-300 bg-emerald-300/10",
    warning: "text-orange-300 bg-orange-300/10",
    danger: "text-red-300 bg-red-300/10",
    info: "text-blue-200 bg-blue-300/10",
  };

  return (
    <Card className="group overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
      <CardContent className="relative p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/5 blur-2xl transition group-hover:bg-amber-300/10" />

        <div
          className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm font-semibold text-white/55">{label}</p>

        <p className="mt-2 text-3xl font-black tracking-tight text-white">
          {formatNumber(value)}
        </p>

        <p className="mt-2 text-xs leading-5 text-white/45">{description}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Quick action card for admin navigation.
 */
function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  isPrimary = false,
}: {
  title: string;
  description: string;
  icon: ElementType;
  onClick: () => void;
  isPrimary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-3xl p-5 text-left transition hover:-translate-y-1",
        isPrimary
          ? "border border-amber-300/25 bg-amber-300/10 hover:border-amber-300/45 hover:bg-amber-300/15"
          : "border border-white/10 bg-white/[0.04] hover:border-amber-300/30 hover:bg-white/[0.07]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-300/10 blur-3xl transition group-hover:bg-amber-300/20" />

      <div
        className={[
          "relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl",
          isPrimary
            ? "bg-amber-400 text-black shadow-lg shadow-amber-500/20"
            : "bg-amber-300/10 text-amber-300",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="relative text-lg font-black text-white">{title}</h3>

      <p className="relative mt-2 min-h-12 text-sm leading-6 text-white/55">
        {description}
      </p>

      <div className="relative mt-5 flex items-center text-sm font-bold text-amber-300">
        Open
        <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </button>
  );
}

/**
 * Empty state for dashboard lists.
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center text-sm text-white/50">
      {message}
    </div>
  );
}

/**
 * Loading skeleton for dashboard.
 */
function DashboardLoading() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-64 rounded-[2rem] bg-white/10" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-3xl bg-white/10" />
        ))}
      </div>

      <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
    </section>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch dashboard data from backend when page loads.
   */
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);

        const data = await getAdminDashboard();

        setDashboard(data);
      } catch (error: unknown) {
        toast.error(
          getApiErrorMessage(error, "Failed to load dashboard analytics.")
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboard();
  }, []);

  const dashboardData = useMemo(() => {
    const safeDashboard = dashboard as unknown as SafeAdminDashboard | null;

    return {
      summary: safeDashboard?.summary ?? {},
      taskStatusSummary: safeDashboard?.charts?.taskStatusSummary ?? [],
      departmentWiseEmployees:
        safeDashboard?.charts?.departmentWiseEmployees ?? [],
      recentEmployees: safeDashboard?.recent?.recentEmployees ?? [],
      recentAttendance: safeDashboard?.recent?.recentAttendance ?? [],
      recentTasks: safeDashboard?.recent?.recentTasks ?? [],
    };
  }, [dashboard]);

  const summaryCards = useMemo(() => {
    if (!dashboard) return [];

    const summary = dashboardData.summary;
    const overdueTasks = getNumberValue(summary.overdueTasks);

    return [
      {
        label: "Total Employees",
        value: getNumberValue(summary.totalEmployees),
        description: "Total workforce registered in HRMS.",
        icon: UsersRound,
        tone: "default" as const,
      },
      {
        label: "Active Employees",
        value: getNumberValue(summary.activeEmployees),
        description: "Currently active employees in the system.",
        icon: UserCheck,
        tone: "success" as const,
      },
      {
        label: "Terminated",
        value: getNumberValue(summary.terminatedEmployees),
        description: "Employees marked as terminated.",
        icon: UserX,
        tone: "danger" as const,
      },
      {
        label: "Today Present",
        value: getNumberValue(summary.todayPresent),
        description: "Employees present based on today attendance.",
        icon: CalendarCheck,
        tone: "success" as const,
      },
      {
        label: "Today Absent",
        value: getNumberValue(summary.todayAbsent),
        description: "Employees absent for today.",
        icon: AlertTriangle,
        tone: "danger" as const,
      },
      {
        label: "Today Late",
        value: getNumberValue(summary.todayLate),
        description: "Employees marked late today.",
        icon: Activity,
        tone: "warning" as const,
      },
      {
        label: "Active Projects",
        value: getNumberValue(summary.activeProjects),
        description: "Projects currently active in the system.",
        icon: BriefcaseBusiness,
        tone: "info" as const,
      },
      {
        label: "Overdue Tasks",
        value: overdueTasks,
        description: "Tasks that crossed their due date.",
        icon: AlertTriangle,
        tone: overdueTasks > 0 ? ("danger" as const) : ("success" as const),
      },
    ];
  }, [dashboard, dashboardData.summary]);

  const maxDepartmentEmployees = useMemo(() => {
    if (dashboardData.departmentWiseEmployees.length === 0) return 1;

    return Math.max(
      ...dashboardData.departmentWiseEmployees.map((department) =>
        getNumberValue(
          department.totalEmployees ?? department.employeeCount ?? department.count
        )
      ),
      1
    );
  }, [dashboardData.departmentWiseEmployees]);

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (!dashboard) {
    return (
      <section className="mx-auto max-w-7xl">
        <Card className="border border-red-300/20 bg-red-300/10 text-white shadow-xl shadow-black/20">
          <CardContent className="p-6">
            <p className="font-bold">Dashboard data not available.</p>
            <p className="mt-2 text-sm text-white/60">
              Please check backend server and login token.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const totalTasks = getNumberValue(dashboardData.summary.totalTasks);
  const totalProjects = getNumberValue(dashboardData.summary.totalProjects);

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      {/* Premium hero section */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[2rem] border border-amber-200/35 bg-[#17100b]/75 p-6 shadow-2xl shadow-black/40 sm:p-8 lg:p-10"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-200">
              <Sparkles className="h-4 w-4" />
              Admin Control Center
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              WorkSync HRMS Dashboard
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              Real-time HRMS overview for workforce, geo attendance, task
              tracking, projects, reports and operational performance.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => router.push("/admin/employees")}
                className="h-11 rounded-xl bg-amber-400 px-5 font-black text-black hover:bg-amber-300"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Manage Employees
              </Button>

              <Button
                onClick={() => router.push("/admin/attendance")}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
              >
                <CalendarCheck className="mr-2 h-4 w-4" />
                Attendance
              </Button>

              <Button
                onClick={() => router.push("/admin/reports")}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
              >
                <FileBarChart className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </div>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 lg:max-w-md">
            <div className="rounded-3xl border border-amber-100/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                <ClipboardList className="h-5 w-5" />
              </div>
              <p className="text-sm text-white/50">Total Tasks</p>
              <p className="mt-1 text-3xl font-black text-white">
                {formatNumber(totalTasks)}
              </p>
            </div>

            <div className="rounded-3xl border border-amber-100/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <p className="text-sm text-white/50">Total Projects</p>
              <p className="mt-1 text-3xl font-black text-white">
                {formatNumber(totalProjects)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.04 }}
          >
            <SummaryCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Admin quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
      >
        <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                  <Zap className="h-3.5 w-3.5" />
                  Admin Workflow
                </div>

                <h2 className="text-2xl font-black text-white">
                  Quick Actions
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Open the most-used admin modules directly from here.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <QuickActionCard
                title="Employees"
                description="Create, update and manage employee records."
                icon={UsersRound}
                isPrimary
                onClick={() => router.push("/admin/employees")}
              />

              <QuickActionCard
                title="Attendance"
                description="View employee attendance, location and photo proof."
                icon={CalendarCheck}
                onClick={() => router.push("/admin/attendance")}
              />

              <QuickActionCard
                title="Tasks"
                description="Manage tasks, status, priority and assignments."
                icon={ClipboardList}
                onClick={() => router.push("/admin/tasks")}
              />

              <QuickActionCard
                title="Projects"
                description="Track internal projects and solar company workflows."
                icon={BriefcaseBusiness}
                onClick={() => router.push("/admin/projects")}
              />

              <QuickActionCard
                title="Settings"
                description="Manage roles, departments, designations and locations."
                icon={Settings}
                onClick={() => router.push("/admin/settings/roles")}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Analytics cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/25">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">Task Status Summary</h2>
                <p className="text-sm text-white/50">
                  Current task distribution
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {dashboardData.taskStatusSummary.length === 0 ? (
                <EmptyState message="No task status data available." />
              ) : (
                dashboardData.taskStatusSummary.map((item, index) => {
                  const status = getTextValue(item.status, "UNKNOWN");
                  const total = getNumberValue(item.total ?? item.count);

                  return (
                    <div
                      key={`${status}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white/70">
                          {status.replaceAll("_", " ")}
                        </span>
                        <Badge className={getStatusBadgeClass(status)}>
                          {formatNumber(total)}
                        </Badge>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{
                            width: `${Math.min(
                              100,
                              (total / Math.max(totalTasks, 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/25">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">Department Strength</h2>
                <p className="text-sm text-white/50">Employees by department</p>
              </div>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
              {dashboardData.departmentWiseEmployees.length === 0 ? (
                <EmptyState message="No department data available." />
              ) : (
                dashboardData.departmentWiseEmployees.map(
                  (department, index) => {
                    const departmentName = getTextValue(
                      department.name ?? department.departmentName,
                      "Unknown Department"
                    );

                    const departmentTotal = getNumberValue(
                      department.totalEmployees ??
                        department.employeeCount ??
                        department.count
                    );

                    return (
                      <div
                        key={department.id || `${departmentName}-${index}`}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-white/70">
                            {departmentName}
                          </span>
                          <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">
                            {formatNumber(departmentTotal)}
                          </Badge>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{
                              width: `${Math.min(
                                100,
                                (departmentTotal / maxDepartmentEmployees) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent data */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/25">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <UsersRound className="h-5 w-5 text-amber-300" />
                Recent Employees
              </h2>

              <Button
                onClick={() => router.push("/admin/employees")}
                variant="outline"
                className="h-9 rounded-xl border-white/10 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10"
              >
                View All
              </Button>
            </div>

            <div className="space-y-3">
              {dashboardData.recentEmployees.length === 0 ? (
                <EmptyState message="No recent employees found." />
              ) : (
                dashboardData.recentEmployees.map((employee, index) => {
                  const employeeStatus = getTextValue(
                    employee.status,
                    "UNKNOWN"
                  );

                  return (
                    <div
                      key={
                        employee.id ||
                        employee.employeeCode ||
                        `employee-${index}`
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                    >
                      <p className="font-bold text-white">
                        {getTextValue(employee.fullName, "Unknown Employee")}
                      </p>
                      <p className="mt-1 break-all text-xs text-white/45">
                        {getTextValue(employee.employeeCode)} •{" "}
                        {getTextValue(employee.email)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className={getStatusBadgeClass(employeeStatus)}>
                          {employeeStatus}
                        </Badge>
                        <Badge className="border-white/10 bg-white/5 text-white/70">
                          {getRoleName(employee.role)}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/25">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <CalendarCheck className="h-5 w-5 text-amber-300" />
                Recent Attendance
              </h2>

              <Button
                onClick={() => router.push("/admin/attendance")}
                variant="outline"
                className="h-9 rounded-xl border-white/10 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10"
              >
                View All
              </Button>
            </div>

            <div className="space-y-3">
              {dashboardData.recentAttendance.length === 0 ? (
                <EmptyState message="No recent attendance found." />
              ) : (
                dashboardData.recentAttendance.map((attendance, index) => {
                  const attendanceStatus = getTextValue(
                    attendance.status,
                    "UNKNOWN"
                  );

                  return (
                    <div
                      key={attendance.id || `attendance-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">
                            {getTextValue(
                              attendance.user?.fullName,
                              "Unknown Employee"
                            )}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            Check-in: {formatDateTime(attendance.checkInAt)}
                          </p>
                        </div>

                        <Badge className={getStatusBadgeClass(attendanceStatus)}>
                          {attendanceStatus}
                        </Badge>
                      </div>

                      <p className="mt-3 text-xs text-white/45">
                        Working minutes:{" "}
                        {formatNumber(attendance.workingMinutes)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/25">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <TrendingUp className="h-5 w-5 text-amber-300" />
                Recent Tasks
              </h2>

              <Button
                onClick={() => router.push("/admin/tasks")}
                variant="outline"
                className="h-9 rounded-xl border-white/10 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10"
              >
                View All
              </Button>
            </div>

            <div className="space-y-3">
              {dashboardData.recentTasks.length === 0 ? (
                <EmptyState message="No recent tasks found." />
              ) : (
                dashboardData.recentTasks.map((task, index) => {
                  const taskStatus = getTextValue(task.status, "UNKNOWN");

                  return (
                    <div
                      key={task.id || `task-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                    >
                      <p className="line-clamp-2 font-bold text-white">
                        {getTextValue(task.title, "Untitled Task")}
                      </p>

                      <p className="mt-1 text-xs text-white/45">
                        Assigned to:{" "}
                        {getTextValue(
                          task.assignedTo?.fullName,
                          "Not Assigned"
                        )}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className={getStatusBadgeClass(taskStatus)}>
                          {taskStatus.replaceAll("_", " ")}
                        </Badge>
                        <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">
                          {getTextValue(task.priority, "NORMAL")}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin note */}
      <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-black text-white">
                    Admin Control Scope
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Admin dashboard provides organization-level visibility for
                    employees, attendance, tasks, projects, reports and master
                    settings.
                  </p>
                </div>

                <Button
                  onClick={() => router.push("/admin/settings/roles")}
                  variant="outline"
                  className="h-10 rounded-xl border-amber-200/30 bg-white/5 px-4 font-bold text-white hover:bg-white/10"
                >
                  Open Settings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}