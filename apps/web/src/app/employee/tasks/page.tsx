"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ResponsivePageActions from "@/components/common/ResponsivePageActions";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock3,
  Filter,
  History,
  LayoutDashboard,
  LogOut,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRound,
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

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  if (!error.response) {
    return "Backend server is not reachable. Please check if API server is running.";
  }

  const statusCode = error.response.status;
  const data = error.response.data;

  if (statusCode === 401)
    return "Your session has expired. Please login again.";
  if (statusCode === 403) return "You do not have permission to view tasks.";
  if (statusCode === 404) {
    return "My Tasks API route not found. Please check backend route /tasks/my-tasks.";
  }
  if (statusCode >= 500) {
    return "Server error while fetching tasks. Please try again after some time.";
  }

  if (Array.isArray(data?.errors)) {
    return data.errors[0]?.message || fallback;
  }

  if (data?.errors && typeof data.errors === "object") {
    const firstKey = Object.keys(data.errors)[0];
    const firstValue = data.errors[firstKey];

    if (Array.isArray(firstValue)) {
      return firstValue[0] || fallback;
    }
  }

  if (Array.isArray(data?.message)) return data.message[0] || fallback;

  if (typeof data?.message === "string") {
    const lowerMessage = data.message.toLowerCase();

    if (
      lowerMessage.includes("invalid `prisma.") ||
      lowerMessage.includes("unknown field") ||
      lowerMessage.includes("available options are marked")
    ) {
      return "Backend database field mismatch. Please check task service and Prisma model.";
    }

    return data.message;
  }

  if (typeof data?.error === "string") return data.error;

  return fallback;
}

async function getMyTasks() {
  const response = await api.get<MyTasksResponse>("/tasks/my-tasks");

  return (
    response.data.data?.tasks ||
    response.data.data?.myTasks ||
    response.data.data?.assignedTasks ||
    []
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function isTaskOverdue(task: TaskItem) {
  if (!task.dueDate) return false;
  if (task.status === "COMPLETED" || task.status === "CANCELLED") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function getTaskUniqueKey(task: TaskItem) {
  return (
    task.id ||
    [
      task.title,
      task.project?.id,
      task.project?.name,
      task.createdBy?.id,
      task.status,
      task.priority,
      task.dueDate,
    ]
      .filter(Boolean)
      .join("-")
  );
}

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

function EmployeeTasksLoading() {
  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-48 rounded-[2rem] bg-white/10" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-3xl bg-white/10" />
          ))}
        </div>

        <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
      </section>
    </main>
  );
}

function TaskSummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  description: string;
  icon: ElementType;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass = {
    default: "bg-amber-300/10 text-amber-300",
    success: "bg-emerald-300/10 text-emerald-300",
    warning: "bg-orange-300/10 text-orange-300",
    danger: "bg-red-300/10 text-red-300",
    info: "bg-blue-300/10 text-blue-200",
  };

  return (
    <Card className="group overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
      <CardContent className="relative p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/5 blur-2xl transition group-hover:bg-amber-300/10" />

        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm font-semibold text-white/55">{label}</p>
        <p className="mt-1 text-2xl font-black text-white">{value}</p>
        <p className="mt-2 text-xs leading-5 text-white/45">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyTasksState({ clearFilters }: { clearFilters: () => void }) {
  return (
    <div className="p-10">
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          <ClipboardList className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-black text-white">
          No assigned tasks found
        </h3>

        <p className="mt-2 text-sm leading-6 text-white/50">
          No task matched your current search, status or priority filter. Clear
          filters and try again.
        </p>

        <Button
          type="button"
          onClick={clearFilters}
          variant="outline"
          className="mt-5 rounded-xl border-amber-200/30 bg-white/5 text-white hover:bg-white/10"
        >
          Clear Filters
        </Button>
      </div>
    </div>
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

        if (storedUser.role === "MANAGER") {
          router.replace("/manager/dashboard");
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
            getApiErrorMessage(error, "Failed to fetch assigned tasks."),
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
   * Duplicate-safe task list.
   * API data -> unique records -> summary -> filters/search -> pagination -> display.
   */
  const uniqueTasks = useMemo(() => {
    const taskMap = new Map<string, TaskItem>();

    tasks.forEach((task) => {
      const uniqueKey = getTaskUniqueKey(task);
      if (!uniqueKey) return;

      if (!taskMap.has(uniqueKey)) {
        taskMap.set(uniqueKey, task);
      }
    });

    return Array.from(taskMap.values());
  }, [tasks]);

  const taskSummary = useMemo(() => {
    const pending = uniqueTasks.filter(
      (task) => task.status === "PENDING",
    ).length;

    const inProgress = uniqueTasks.filter(
      (task) => task.status === "IN_PROGRESS",
    ).length;

    const completed = uniqueTasks.filter(
      (task) => task.status === "COMPLETED",
    ).length;

    const overdue = uniqueTasks.filter((task) => isTaskOverdue(task)).length;

    return {
      total: uniqueTasks.length,
      pending,
      inProgress,
      completed,
      overdue,
    };
  }, [uniqueTasks]);

  const filteredTasks = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    return uniqueTasks.filter((task) => {
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
        task.createdBy?.employeeCode,
        formatDate(task.dueDate),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [uniqueTasks, searchTerm, statusFilter, priorityFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTasks.length / TASKS_PER_PAGE),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * TASKS_PER_PAGE;
  const endIndex = startIndex + TASKS_PER_PAGE;

  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCurrentPage(1);
  };

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
        {/* Premium header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[2rem] border border-amber-200/30 bg-[#17100b]/75 p-6 shadow-2xl shadow-black/30 sm:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-200">
                <Sparkles className="h-4 w-4" />
                Employee Tasks
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                Assigned Tasks
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                View your assigned tasks, priority, due dates, project context
                and current task progress in one clean employee workspace.
              </p>
            </div>

            <ResponsivePageActions
              actions={[
                {
                  label: "Dashboard",
                  icon: LayoutDashboard,
                  onClick: () => router.push("/employee/dashboard"),
                },
                {
                  label: "Attendance",
                  icon: CalendarCheck,
                  onClick: () => router.push("/employee/attendance"),
                },
                {
                  label: "History",
                  icon: History,
                  onClick: () => router.push("/employee/attendance/history"),
                },
                {
                  label: isRefreshing ? "Refreshing..." : "Refresh",
                  icon: RefreshCcw,
                  onClick: handleRefresh,
                  disabled: isRefreshing,
                },
                {
                  label: "Logout",
                  icon: LogOut,
                  onClick: handleLogout,
                  variant: "danger",
                },
              ]}
            />
          </div>
        </motion.div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <TaskSummaryCard
            label="Total Tasks"
            value={taskSummary.total}
            description="Unique assigned tasks."
            icon={ClipboardList}
          />

          <TaskSummaryCard
            label="Pending"
            value={taskSummary.pending}
            description="Tasks waiting to start."
            icon={Timer}
            tone="warning"
          />

          <TaskSummaryCard
            label="In Progress"
            value={taskSummary.inProgress}
            description="Tasks currently active."
            icon={Clock3}
            tone="info"
          />

          <TaskSummaryCard
            label="Completed"
            value={taskSummary.completed}
            description="Tasks marked completed."
            icon={CheckCircle2}
            tone="success"
          />

          <TaskSummaryCard
            label="Overdue"
            value={taskSummary.overdue}
            description="Open tasks past due date."
            icon={AlertTriangle}
            tone={taskSummary.overdue > 0 ? "danger" : "default"}
          />
        </div>

        {/* Task list */}
        <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
          <CardContent className="p-0">
            {/* Filters */}
            <div className="space-y-4 border-b border-white/10 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                    <Filter className="h-3.5 w-3.5" />
                    Task Directory
                  </div>

                  <h2 className="text-xl font-black text-white">Task List</h2>

                  <p className="mt-1 text-sm text-white/50">
                    Showing {filteredTasks.length === 0 ? 0 : startIndex + 1}-
                    {Math.min(endIndex, filteredTasks.length)} of{" "}
                    {filteredTasks.length} tasks
                  </p>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-5xl xl:grid-cols-[1.5fr_1fr_1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search task, project, creator..."
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
            <div className="hidden border-b border-white/10 px-5 py-4 xl:grid xl:grid-cols-[1.55fr_1fr_0.8fr_0.85fr_0.95fr_1fr] xl:gap-4">
              <p className="text-sm font-bold text-white/50">Task</p>
              <p className="text-sm font-bold text-white/50">Project</p>
              <p className="text-sm font-bold text-white/50">Priority</p>
              <p className="text-sm font-bold text-white/50">Status</p>
              <p className="text-sm font-bold text-white/50">Due Date</p>
              <p className="text-right text-sm font-bold text-white/50">
                Created By
              </p>
            </div>

            {/* Responsive task list */}
            <div className="divide-y divide-white/10">
              {filteredTasks.length === 0 ? (
                <EmptyTasksState clearFilters={clearFilters} />
              ) : (
                paginatedTasks.map((task) => (
                  <div
                    key={getTaskUniqueKey(task)}
                    className="grid gap-5 p-5 hover:bg-white/[0.025] xl:grid-cols-[1.55fr_1fr_0.8fr_0.85fr_0.95fr_1fr] xl:items-center xl:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/40 xl:hidden">Task</p>

                      <p className="break-words font-black text-white">
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

                    <div className="min-w-0">
                      <p className="text-sm text-white/40 xl:hidden">Project</p>

                      <p className="break-words text-sm font-semibold text-white/70">
                        {task.project?.name || "No project"}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-sm text-white/40 xl:hidden">
                        Priority
                      </p>

                      <Badge
                        className={getTaskPriorityBadgeClass(task.priority)}
                      >
                        {task.priority || "—"}
                      </Badge>
                    </div>

                    <div>
                      <p className="mb-1 text-sm text-white/40 xl:hidden">
                        Status
                      </p>

                      <Badge className={getTaskStatusBadgeClass(task.status)}>
                        {task.status?.replaceAll("_", " ") || "—"}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm text-white/40 xl:hidden">
                        Due Date
                      </p>

                      <p className="flex items-center gap-2 text-sm text-white/70">
                        <CalendarDays className="h-4 w-4 shrink-0 text-amber-300" />
                        {formatDate(task.dueDate)}
                      </p>
                    </div>

                    <div className="min-w-0 xl:text-right">
                      <p className="text-sm text-white/40 xl:hidden">
                        Created By
                      </p>

                      <p className="break-words text-sm font-semibold text-white">
                        {task.createdBy?.fullName || "—"}
                      </p>

                      {task.createdBy?.employeeCode ? (
                        <p className="mt-1 text-xs text-white/45">
                          {task.createdBy.employeeCode}
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
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">
                  Duplicate-safe Task Display
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  This page shows unique assigned tasks only. Duplicate rows
                  from API response are filtered before summary, search,
                  pagination and list rendering.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              onClick={() => router.push("/employee/dashboard")}
              className="h-11 rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>

            <Button
              onClick={() => router.push("/employee/attendance")}
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              Attendance
            </Button>

            <Button
              onClick={() => router.push("/employee/attendance/history")}
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <History className="mr-2 h-4 w-4" />
              History
            </Button>

            <Button
              onClick={() => router.push("/employee/profile")}
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <UserRound className="mr-2 h-4 w-4" />
              Profile
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
