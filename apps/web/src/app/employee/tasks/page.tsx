"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock3,
  ExternalLink,
  History,
  LayoutDashboard,
  LogOut,
  RefreshCcw,
  Search,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "@/services/api.service";
import { clearAuthSession } from "@/services/auth.service";
import { AuthUser } from "@/types/auth.types";

type BackendValidationIssue = {
  path?: string[];
  message?: string;
  code?: string;
};

type ApiErrorResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
  errors?: BackendValidationIssue[] | Record<string, string[]>;
};

type TaskStatus =
  | "ALL"
  | "PENDING"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED"
  | "CANCELLED";

type TaskPriority = "ALL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type TaskItem = {
  id: string;
  title: string;
  description?: string | null;
  status: Exclude<TaskStatus, "ALL"> | string;
  priority: Exclude<TaskPriority, "ALL"> | string;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  project?: {
    id?: string;
    name?: string;
  } | null;
  createdBy?: {
    id?: string;
    fullName?: string;
    employeeCode?: string;
  } | null;
};

type MyTasksResponse = {
  success: boolean;
  message: string;
  data?: {
    tasks?: TaskItem[];
    myTasks?: TaskItem[];
    assignedTasks?: TaskItem[];
  };
};

const TASKS_PER_PAGE = 10;

/**
 * Reads logged-in user from localStorage.
 */
function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const user = localStorage.getItem("worksync_user");

  if (!user) return null;

  try {
    return JSON.parse(user) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Converts backend/API errors into clean user-friendly messages.
 */
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
    return "You do not have permission to view tasks.";
  }

  if (statusCode === 404) {
    return "My Tasks API route not found. Please check backend route /tasks/my-tasks.";
  }

  if (statusCode >= 500) {
    return "Server error while fetching tasks. Please try again after some time.";
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

/**
 * Fetch logged-in employee assigned tasks.
 *
 * Expected backend route:
 * GET /api/tasks/my-tasks
 *
 * If your backend route name is different, change only this endpoint.
 */
async function getMyTasks() {
  const response = await api.get<MyTasksResponse>("/tasks/my-tasks");

  return (
    response.data.data?.tasks ||
    response.data.data?.myTasks ||
    response.data.data?.assignedTasks ||
    []
  );
}

/**
 * Formats date into readable UI format.
 */
function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

/**
 * Checks whether task due date is overdue.
 */
function isTaskOverdue(task: TaskItem) {
  if (!task.dueDate) return false;
  if (task.status === "COMPLETED" || task.status === "CANCELLED") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

/**
 * Task status badge style.
 */
function getTaskStatusBadgeClass(status: string) {
  if (status === "COMPLETED") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (status === "IN_PROGRESS") {
    return "border-blue-300/20 bg-blue-300/10 text-blue-200";
  }

  if (status === "IN_REVIEW") {
    return "border-purple-300/20 bg-purple-300/10 text-purple-200";
  }

  if (status === "PENDING") {
    return "border-orange-300/20 bg-orange-300/10 text-orange-200";
  }

  if (status === "CANCELLED") {
    return "border-red-300/20 bg-red-300/10 text-red-200";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

/**
 * Task priority badge style.
 */
function getTaskPriorityBadgeClass(priority: string) {
  if (priority === "URGENT") {
    return "border-red-300/20 bg-red-300/10 text-red-200";
  }

  if (priority === "HIGH") {
    return "border-orange-300/20 bg-orange-300/10 text-orange-200";
  }

  if (priority === "MEDIUM") {
    return "border-yellow-300/20 bg-yellow-300/10 text-yellow-100";
  }

  if (priority === "LOW") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

/**
 * Loading skeleton.
 */
function EmployeeTasksLoading() {
  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-44 rounded-[2rem] bg-white/10" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-3xl bg-white/10" />
          ))}
        </div>

        <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
      </section>
    </main>
  );
}

/**
 * Summary card component.
 */
function TaskSummaryCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: ElementType;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-amber-300/10 text-amber-300",
    success: "bg-emerald-300/10 text-emerald-300",
    warning: "bg-orange-300/10 text-orange-300",
    danger: "bg-red-300/10 text-red-300",
  };

  return (
    <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
      <CardContent className="p-5">
        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm text-white/55">{label}</p>
        <p className="mt-1 text-2xl font-black text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function EmployeeTasksPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPageReady, setIsPageReady] = useState(false);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority>("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Client-side role protection.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = localStorage.getItem("worksync_access_token");
      const storedUser = getStoredUser();

      if (!token || !storedUser) {
        router.replace("/login");
        return;
      }

      if (storedUser.role !== "EMPLOYEE") {
        toast.error("My Tasks page is only for employee users.");

        if (storedUser.role === "SUPER_ADMIN" || storedUser.role === "ADMIN") {
          router.replace("/admin/dashboard");
          return;
        }

        router.replace("/login");
        return;
      }

      setUser(storedUser);
      setIsPageReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [router]);

  /**
   * Load employee tasks after session is ready.
   */
  useEffect(() => {
    if (!isPageReady || !user || user.role !== "EMPLOYEE") return;

    let isMounted = true;

    const loadTasks = async () => {
      try {
        const records = await getMyTasks();

        if (isMounted) {
          setTasks(records);
        }
      } catch (error: unknown) {
        if (isMounted) {
          toast.error(
            getApiErrorMessage(error, "Failed to fetch assigned tasks.")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTasks();

    return () => {
      isMounted = false;
    };
  }, [isPageReady, user]);

  /**
   * Refresh task list manually.
   */
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);

      const records = await getMyTasks();

      setTasks(records);
      toast.success("Tasks refreshed successfully.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to refresh tasks."));
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Task summary calculation.
   */
  const taskSummary = useMemo(() => {
    const pending = tasks.filter((task) => task.status === "PENDING").length;

    const inProgress = tasks.filter(
      (task) => task.status === "IN_PROGRESS"
    ).length;

    const completed = tasks.filter(
      (task) => task.status === "COMPLETED"
    ).length;

    const overdue = tasks.filter((task) => isTaskOverdue(task)).length;

    return {
      total: tasks.length,
      pending,
      inProgress,
      completed,
      overdue,
    };
  }, [tasks]);

  /**
   * Search + filter tasks.
   */
  const filteredTasks = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    return tasks.filter((task) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" ? true : task.priority === priorityFilter;

      const searchableText = [
        task.title,
        task.description,
        task.status,
        task.priority,
        task.project?.name,
        task.createdBy?.fullName,
        formatDate(task.dueDate),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword
        ? searchableText.includes(keyword)
        : true;

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  /**
   * Pagination calculation.
   */
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PER_PAGE));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * TASKS_PER_PAGE;
  const endIndex = startIndex + TASKS_PER_PAGE;

  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  /**
   * Clears filters and resets pagination.
   */
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCurrentPage(1);
  };

  /**
   * Logout employee.
   */
  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  if (!isPageReady || !user || user.role !== "EMPLOYEE" || isLoading) {
    return <EmployeeTasksLoading />;
  }

  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-[2rem] border border-amber-200/30 bg-[#17100b]/75 p-6 shadow-2xl shadow-black/30 sm:p-8"
        >
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-300">
                <ClipboardList className="h-4 w-4" />
                My Tasks
              </p>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Assigned Tasks
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
                View your assigned tasks, priority, due dates, project context
                and current task status.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => router.push("/employee/dashboard")}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>

              <Button
                onClick={() => router.push("/employee/attendance")}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
              >
                <CalendarCheck className="mr-2 h-4 w-4" />
                Attendance
              </Button>

              <Button
                onClick={() => router.push("/employee/attendance/history")}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
              >
                <History className="mr-2 h-4 w-4" />
                History
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="h-11 rounded-xl border-red-300/20 bg-red-300/10 px-5 font-bold text-red-100 hover:bg-red-300/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TaskSummaryCard
            label="Total Tasks"
            value={taskSummary.total}
            icon={ClipboardList}
          />

          <TaskSummaryCard
            label="In Progress"
            value={taskSummary.inProgress}
            icon={Clock3}
            tone="warning"
          />

          <TaskSummaryCard
            label="Completed"
            value={taskSummary.completed}
            icon={CheckCircle2}
            tone="success"
          />

          <TaskSummaryCard
            label="Overdue"
            value={taskSummary.overdue}
            icon={AlertTriangle}
            tone="danger"
          />
        </div>

        {/* Task list */}
        <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
          <CardContent className="p-0">
            {/* Filters */}
            <div className="space-y-4 border-b border-white/10 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Task List</h2>
                  <p className="mt-1 text-sm text-white/50">
                    Showing {filteredTasks.length === 0 ? 0 : startIndex + 1}-
                    {Math.min(endIndex, filteredTasks.length)} of{" "}
                    {filteredTasks.length} tasks
                  </p>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-4xl xl:grid-cols-[1.5fr_1fr_1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search task..."
                      className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/35"
                    />
                  </div>

                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value as TaskStatus);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-11 border-white/10 bg-white/[0.04] text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>

                    <SelectContent className="border-white/10 bg-[#17100b] text-white">
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="IN_REVIEW">In Review</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={priorityFilter}
                    onValueChange={(value) => {
                      setPriorityFilter(value as TaskPriority);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-11 border-white/10 bg-white/[0.04] text-white">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>

                    <SelectContent className="border-white/10 bg-[#17100b] text-white">
                      <SelectItem value="ALL">All Priority</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="h-11 rounded-xl border-white/10 bg-white/5 px-5 text-white hover:bg-white/10"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop header */}
            <div className="hidden border-b border-white/10 px-5 py-4 xl:grid xl:grid-cols-[1.8fr_0.9fr_0.9fr_1fr_1.2fr] xl:gap-4">
              <p className="text-sm font-bold text-white/50">Task</p>
              <p className="text-sm font-bold text-white/50">Status</p>
              <p className="text-sm font-bold text-white/50">Priority</p>
              <p className="text-sm font-bold text-white/50">Due Date</p>
              <p className="text-right text-sm font-bold text-white/50">
                Project
              </p>
            </div>

            {/* Responsive task list */}
            <div className="divide-y divide-white/10">
              {filteredTasks.length === 0 ? (
                <div className="p-10 text-center text-white/50">
                  No assigned tasks found.
                </div>
              ) : (
                paginatedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="grid gap-5 p-5 hover:bg-white/[0.025] xl:grid-cols-[1.8fr_0.9fr_0.9fr_1fr_1.2fr] xl:items-center xl:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/40 xl:hidden">Task</p>
                      <p className="break-words font-bold text-white">
                        {task.title}
                      </p>

                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/50">
                        {task.description || "No description added."}
                      </p>

                      {isTaskOverdue(task) ? (
                        <Badge className="mt-2 border-red-300/20 bg-red-300/10 text-red-100">
                          Overdue
                        </Badge>
                      ) : null}
                    </div>

                    <div>
                      <p className="mb-1 text-sm text-white/40 xl:hidden">
                        Status
                      </p>
                      <Badge className={getTaskStatusBadgeClass(task.status)}>
                        {task.status.replaceAll("_", " ")}
                      </Badge>
                    </div>

                    <div>
                      <p className="mb-1 text-sm text-white/40 xl:hidden">
                        Priority
                      </p>
                      <Badge
                        className={getTaskPriorityBadgeClass(task.priority)}
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm text-white/40 xl:hidden">
                        Due Date
                      </p>
                      <p className="flex items-center gap-2 text-sm text-white/70">
                        <Timer className="h-4 w-4 shrink-0 text-amber-300" />
                        {formatDate(task.dueDate)}
                      </p>
                    </div>

                    <div className="xl:text-right">
                      <p className="text-sm text-white/40 xl:hidden">
                        Project
                      </p>
                      <p className="break-words text-sm font-semibold text-white">
                        {task.project?.name || "No project"}
                      </p>

                      {task.createdBy?.fullName ? (
                        <p className="mt-1 text-xs text-white/45">
                          By: {task.createdBy.fullName}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-4 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/50">
                Page {safeCurrentPage} of {totalPages} • {TASKS_PER_PAGE} tasks
                per page
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={safeCurrentPage === 1}
                  onClick={() =>
                    setCurrentPage(Math.max(1, safeCurrentPage - 1))
                  }
                  className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex min-w-24 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-bold text-amber-100">
                  {safeCurrentPage} / {totalPages}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))
                  }
                  className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Note */}
        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                <ExternalLink className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-black text-white">Task Updates</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  This page currently displays assigned tasks. Task status update
                  actions can be connected after confirming backend task update
                  API route.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}