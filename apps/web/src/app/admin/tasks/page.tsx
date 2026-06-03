"use client";

import { useCallback, useEffect, useMemo, useState, type ElementType } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock3,
  Edit,
  Filter,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { getAllEmployees } from "@/services/employee.service";
import { getAllProjects } from "@/services/project.service";
import {
  createTask,
  deleteTask,
  getAllTasks,
  updateTask,
  updateTaskStatus,
} from "@/services/task.service";
import { Employee } from "@/types/employee.types";
import { Project } from "@/types/project.types";
import { Task, TaskPriority, TaskStatus } from "@/types/task.types";

type ApiErrorResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
};

type TaskFilterStatus = "ALL" | TaskStatus;
type TaskFilterPriority = "ALL" | TaskPriority;

type TaskFormState = {
  title: string;
  description: string;
  projectId: string;
  assignedToId: string;
  priority: TaskPriority;
  dueDate: string;
};

const TASKS_PER_PAGE = 10;

const initialTaskForm: TaskFormState = {
  title: "",
  description: "",
  projectId: "none",
  assignedToId: "",
  priority: "MEDIUM",
  dueDate: "",
};

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
    return "You do not have permission to perform this task action.";
  }

  if (statusCode === 404) {
    return "Task API route not found. Please check backend task routes.";
  }

  if (statusCode >= 500) {
    return "Server error while processing task request. Please try again later.";
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
 * Creates a stable key for duplicate checking.
 *
 * Primary key should be task.id.
 * Fallback key prevents duplicate UI if backend accidentally sends
 * records without id.
 */
function getTaskUniqueKey(task: Task) {
  return (
    task.id ||
    [
      task.title,
      task.assignedTo?.id,
      task.assignedTo?.employeeCode,
      task.project?.id,
      task.priority,
      task.status,
      task.dueDate,
    ]
      .filter(Boolean)
      .join("-")
  );
}

/**
 * Converts backend ISO date into YYYY-MM-DD for date input.
 */
function toDateInputValue(value?: string | null) {
  if (!value) return "";

  return new Date(value).toISOString().split("T")[0];
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
 * Returns task status badge design.
 */
function getTaskStatusBadgeClass(status: string) {
  if (status === "COMPLETED") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (status === "IN_PROGRESS" || status === "IN_REVIEW") {
    return "border-orange-300/20 bg-orange-300/10 text-orange-200";
  }

  if (status === "CANCELLED") {
    return "border-red-300/20 bg-red-300/10 text-red-200";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-100";
}

/**
 * Returns task priority badge design.
 */
function getTaskPriorityBadgeClass(priority: string) {
  if (priority === "URGENT") {
    return "border-red-300/20 bg-red-300/10 text-red-200";
  }

  if (priority === "HIGH") {
    return "border-orange-300/20 bg-orange-300/10 text-orange-200";
  }

  if (priority === "LOW") {
    return "border-sky-300/20 bg-sky-300/10 text-sky-200";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-100";
}

/**
 * Checks whether task is overdue.
 */
function isTaskOverdue(task: Task) {
  if (!task.dueDate) return false;

  const completedStatuses = ["COMPLETED", "CANCELLED"];

  if (completedStatuses.includes(task.status)) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

/**
 * Summary card for task counts.
 */
function TaskSummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
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
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm font-semibold text-white/55">{label}</p>
        <p className="mt-1 text-3xl font-black text-white">{value}</p>
        <p className="mt-2 text-xs leading-5 text-white/45">{description}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for tasks page.
 */
function TasksLoading() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-48 rounded-[2rem] bg-white/10" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-3xl bg-white/10" />
        ))}
      </div>

      <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
    </section>
  );
}

/**
 * Better empty state for tasks page.
 */
function EmptyTasksState({ clearFilters }: { clearFilters: () => void }) {
  return (
    <div className="p-10">
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          <ClipboardList className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-black text-white">No tasks found</h3>
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

/**
 * Small detail box used inside modals.
 */
function DetailPill({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/40">
        <Icon className="h-3.5 w-3.5 text-amber-300" />
        {label}
      </div>

      <p className="break-words text-sm font-bold text-white">{value || "—"}</p>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskFilterStatus>("ALL");
  const [priorityFilter, setPriorityFilter] =
    useState<TaskFilterPriority>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TaskFormState>(initialTaskForm);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<TaskFormState>(initialTaskForm);
  const [isUpdating, setIsUpdating] = useState(false);

  const [statusTarget, setStatusTarget] = useState<Task | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<TaskStatus>("PENDING");
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetch tasks from backend.
   */
  const fetchTasks = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const data = await getAllTasks();

      setTasks(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch tasks."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch dropdown data for task create/edit forms.
   */
  const fetchDropdownData = useCallback(async () => {
    try {
      const [employeesData, projectsData] = await Promise.all([
        getAllEmployees(),
        getAllProjects(),
      ]);

      setEmployees(employeesData);
      setProjects(projectsData);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "Failed to load task form dropdowns.")
      );
    }
  }, []);

  /**
   * Initial page load.
   */
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchTasks(false), fetchDropdownData()]);
    };

    void loadInitialData();
  }, [fetchTasks, fetchDropdownData]);

  /**
   * Duplicate-safe tasks.
   *
   * Important:
   * Always use this array for summary, filters and display.
   * This prevents duplicate tasks from showing on UI even if API sends
   * duplicate rows accidentally.
   */
  const uniqueTasks = useMemo(() => {
    const taskMap = new Map<string, Task>();

    tasks.forEach((task) => {
      const uniqueKey = getTaskUniqueKey(task);

      if (!uniqueKey) return;

      if (!taskMap.has(uniqueKey)) {
        taskMap.set(uniqueKey, task);
      }
    });

    return Array.from(taskMap.values());
  }, [tasks]);

  /**
   * Active employee dropdown options.
   */
  const assignableEmployees = useMemo(() => {
    return employees.filter((employee) => employee.status === "ACTIVE");
  }, [employees]);

  /**
   * Active/planned project dropdown options.
   */
  const availableProjects = useMemo(() => {
    return projects.filter((project) =>
      ["PLANNED", "ACTIVE", "ON_HOLD"].includes(project.status)
    );
  }, [projects]);

  /**
   * Summary cards calculation.
   */
  const taskSummary = useMemo(() => {
    return {
      total: uniqueTasks.length,
      pending: uniqueTasks.filter((task) => task.status === "PENDING").length,
      inProgress: uniqueTasks.filter((task) => task.status === "IN_PROGRESS")
        .length,
      completed: uniqueTasks.filter((task) => task.status === "COMPLETED")
        .length,
      overdue: uniqueTasks.filter((task) => isTaskOverdue(task)).length,
    };
  }, [uniqueTasks]);

  /**
   * Search + status + priority filtering.
   */
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
        task.assignedTo?.fullName,
        task.assignedTo?.employeeCode,
        task.createdBy?.fullName,
        formatDate(task.dueDate),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [uniqueTasks, searchTerm, statusFilter, priorityFilter]);

  /**
   * Pagination calculation.
   * Only 10 tasks will show per page.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTasks.length / TASKS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * TASKS_PER_PAGE;
  const endIndex = startIndex + TASKS_PER_PAGE;

  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  /**
   * Updates create form.
   */
  const updateCreateForm = (field: keyof TaskFormState, value: string) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Updates edit form.
   */
  const updateEditForm = (field: keyof TaskFormState, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Common task validation for create/edit.
   */
  const validateTaskForm = (form: TaskFormState) => {
    if (!form.title.trim()) {
      toast.error("Task title is required.");
      return false;
    }

    if (form.title.trim().length < 3) {
      toast.error("Task title must be at least 3 characters.");
      return false;
    }

    if (!form.assignedToId) {
      toast.error("Assigned employee is required.");
      return false;
    }

    return true;
  };

  /**
   * Creates new task.
   */
  const handleCreateTask = async () => {
    if (!validateTaskForm(createForm)) return;

    try {
      setIsCreating(true);

      await createTask({
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        projectId: createForm.projectId === "none" ? null : createForm.projectId,
        assignedToId: createForm.assignedToId,
        priority: createForm.priority,
        dueDate: createForm.dueDate || null,
      });

      toast.success("Task created successfully.");

      setCreateForm(initialTaskForm);
      setIsCreateOpen(false);
      setCurrentPage(1);

      await fetchTasks(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to create task."));
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Opens edit modal with selected task values.
   */
  const openEditModal = (task: Task) => {
    setSelectedTask(task);

    setEditForm({
      title: task.title || "",
      description: task.description || "",
      projectId: task.project?.id || "none",
      assignedToId: task.assignedTo?.id || "",
      priority: task.priority as TaskPriority,
      dueDate: toDateInputValue(task.dueDate),
    });

    setIsEditOpen(true);
  };

  /**
   * Updates selected task details.
   */
  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    if (!validateTaskForm(editForm)) return;

    try {
      setIsUpdating(true);

      await updateTask(selectedTask.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        projectId: editForm.projectId === "none" ? null : editForm.projectId,
        assignedToId: editForm.assignedToId,
        priority: editForm.priority,
        dueDate: editForm.dueDate || null,
      });

      toast.success("Task updated successfully.");

      setSelectedTask(null);
      setEditForm(initialTaskForm);
      setIsEditOpen(false);

      await fetchTasks(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update task."));
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Opens status update modal.
   */
  const openStatusModal = (task: Task) => {
    setStatusTarget(task);
    setNewStatus(task.status as TaskStatus);
    setIsStatusOpen(true);
  };

  /**
   * Updates selected task status.
   */
  const handleUpdateStatus = async () => {
    if (!statusTarget) return;

    try {
      setIsStatusUpdating(true);

      await updateTaskStatus(statusTarget.id, {
        status: newStatus,
      });

      toast.success("Task status updated successfully.");

      setStatusTarget(null);
      setIsStatusOpen(false);

      await fetchTasks(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update task status."));
    } finally {
      setIsStatusUpdating(false);
    }
  };

  /**
   * Opens delete confirmation modal.
   */
  const openDeleteModal = (task: Task) => {
    setDeleteTarget(task);
    setIsDeleteOpen(true);
  };

  /**
   * Deletes selected task.
   */
  const handleDeleteTask = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);

      await deleteTask(deleteTarget.id);

      toast.success("Task deleted successfully.");

      setDeleteTarget(null);
      setIsDeleteOpen(false);

      await fetchTasks(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete task."));
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Clears filters.
   */
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCurrentPage(1);
  };

  if (isLoading) {
    return <TasksLoading />;
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      {/* Premium hero */}
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
              Task Management
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Manage Employee Tasks
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              Create, assign and track employee tasks for internal projects,
              O&M work, operations and team coordination.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => fetchTasks(true)}
              variant="outline"
              className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 rounded-xl bg-amber-400 px-5 font-black text-black hover:bg-amber-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                    Create New Task
                  </DialogTitle>
                  <p className="text-sm text-white/50">
                    Assign a task to an employee with priority, project and due
                    date.
                  </p>
                </DialogHeader>

                <div className="grid gap-4 pt-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Task Title</Label>
                    <Input
                      value={createForm.title}
                      onChange={(event) =>
                        updateCreateForm("title", event.target.value)
                      }
                      placeholder="Prepare O&M weekly update"
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={createForm.description}
                      onChange={(event) =>
                        updateCreateForm("description", event.target.value)
                      }
                      placeholder="Describe task details..."
                      className="min-h-28 border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Assigned Employee</Label>
                    <Select
                      value={createForm.assignedToId}
                      onValueChange={(value) =>
                        updateCreateForm("assignedToId", value)
                      }
                    >
                      <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>

                      <SelectContent className="border-white/10 bg-[#17100b] text-white">
                        {assignableEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.fullName} - {employee.employeeCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select
                      value={createForm.projectId}
                      onValueChange={(value) =>
                        updateCreateForm("projectId", value)
                      }
                    >
                      <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>

                      <SelectContent className="border-white/10 bg-[#17100b] text-white">
                        <SelectItem value="none">No project</SelectItem>
                        {availableProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={createForm.priority}
                      onValueChange={(value) =>
                        updateCreateForm("priority", value)
                      }
                    >
                      <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>

                      <SelectContent className="border-white/10 bg-[#17100b] text-white">
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={createForm.dueDate}
                      onChange={(event) =>
                        updateCreateForm("dueDate", event.target.value)
                      }
                      className="border-white/10 bg-white/[0.04] text-white"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    onClick={handleCreateTask}
                    disabled={isCreating}
                    className="rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Task
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TaskSummaryCard
          label="Total Tasks"
          value={taskSummary.total}
          description="Unique tasks available in the system."
          icon={ClipboardList}
        />

        <TaskSummaryCard
          label="In Progress"
          value={taskSummary.inProgress}
          description="Tasks currently being worked on."
          icon={Clock3}
          tone="warning"
        />

        <TaskSummaryCard
          label="Completed"
          value={taskSummary.completed}
          description="Tasks marked as completed."
          icon={CheckCircle2}
          tone="success"
        />

        <TaskSummaryCard
          label="Overdue"
          value={taskSummary.overdue}
          description="Pending tasks past their due date."
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
                    placeholder="Search task, employee, project..."
                    className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/35"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as TaskFilterStatus);
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
                    setPriorityFilter(value as TaskFilterPriority);
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
          <div className="hidden border-b border-white/10 px-5 py-4 xl:grid xl:grid-cols-[1.5fr_1fr_1fr_0.8fr_0.9fr_1.1fr] xl:gap-4">
            <p className="text-sm font-bold text-white/50">Task</p>
            <p className="text-sm font-bold text-white/50">Assigned To</p>
            <p className="text-sm font-bold text-white/50">Project</p>
            <p className="text-sm font-bold text-white/50">Priority</p>
            <p className="text-sm font-bold text-white/50">Status</p>
            <p className="text-right text-sm font-bold text-white/50">
              Actions
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
                  className="grid gap-5 p-5 hover:bg-white/[0.025] xl:grid-cols-[1.5fr_1fr_1fr_0.8fr_0.9fr_1.1fr] xl:items-center xl:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/40 xl:hidden">Task</p>
                    <p className="break-words font-black text-white">
                      {task.title}
                    </p>
                    <p className="mt-1 line-clamp-2 break-words text-xs text-white/45">
                      {task.description || "No description"}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="flex items-center gap-2 text-xs text-white/45">
                        <CalendarDays className="h-3.5 w-3.5 text-amber-300" />
                        Due: {formatDate(task.dueDate)}
                      </p>

                      {isTaskOverdue(task) ? (
                        <Badge className="border-red-300/20 bg-red-300/10 text-red-100">
                          Overdue
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40 xl:hidden">
                      Assigned To
                    </p>
                    <p className="flex items-center gap-2 break-words font-semibold text-white">
                      <UserRound className="h-4 w-4 shrink-0 text-amber-300" />
                      {task.assignedTo?.fullName || "—"}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {task.assignedTo?.employeeCode || ""}
                    </p>
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
                    <Badge className={getTaskPriorityBadgeClass(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-white/40 xl:hidden">
                      Status
                    </p>
                    <Badge className={getTaskStatusBadgeClass(task.status)}>
                      {task.status.replaceAll("_", " ")}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openStatusModal(task)}
                      className="rounded-xl border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20"
                    >
                      Status
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(task)}
                      className="rounded-xl border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteModal(task)}
                      className="rounded-xl border-red-300/20 bg-red-300/10 text-red-100 hover:bg-red-300/20"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
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
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
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

      {/* Admin note */}
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
                This page shows unique tasks only. Duplicate rows from API
                response are filtered before summary, search and list rendering.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Task Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Edit Task</DialogTitle>
            <p className="text-sm text-white/50">
              Update task title, assigned employee, project, priority and due
              date.
            </p>
          </DialogHeader>

          {selectedTask ? (
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-2">
              <DetailPill
                icon={ClipboardList}
                label="Task"
                value={selectedTask.title}
              />
              <DetailPill
                icon={UserRound}
                label="Assigned To"
                value={selectedTask.assignedTo?.fullName || "—"}
              />
            </div>
          ) : null}

          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Task Title</Label>
              <Input
                value={editForm.title}
                onChange={(event) => updateEditForm("title", event.target.value)}
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(event) =>
                  updateEditForm("description", event.target.value)
                }
                className="min-h-28 border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2">
              <Label>Assigned Employee</Label>
              <Select
                value={editForm.assignedToId}
                onValueChange={(value) =>
                  updateEditForm("assignedToId", value)
                }
              >
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#17100b] text-white">
                  {assignableEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.fullName} - {employee.employeeCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={editForm.projectId}
                onValueChange={(value) => updateEditForm("projectId", value)}
              >
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#17100b] text-white">
                  <SelectItem value="none">No project</SelectItem>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={editForm.priority}
                onValueChange={(value) => updateEditForm("priority", value)}
              >
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#17100b] text-white">
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={editForm.dueDate}
                onChange={(event) =>
                  updateEditForm("dueDate", event.target.value)
                }
                className="border-white/10 bg-white/[0.04] text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleUpdateTask}
              disabled={isUpdating}
              className="rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="border-amber-100/15 bg-[#17100b] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Update Task Status
            </DialogTitle>
            <p className="text-sm text-white/50">
              Change current task progress status.
            </p>
          </DialogHeader>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="font-bold text-white">
              {statusTarget?.title || "Selected task"}
            </p>
            <p className="mt-1 text-sm text-white/50">
              Assigned to: {statusTarget?.assignedTo?.fullName || "—"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as TaskStatus)}
            >
              <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>

              <SelectContent className="border-white/10 bg-[#17100b] text-white">
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStatusOpen(false)}
              className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleUpdateStatus}
              disabled={isStatusUpdating}
              className="rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
            >
              {isStatusUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-red-300/20 bg-[#17100b] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-100">
              Delete Task
            </DialogTitle>
            <p className="text-sm text-white/50">
              This action will permanently remove the selected task if backend
              allows it.
            </p>
          </DialogHeader>

          <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4">
            <p className="font-bold text-white">
              {deleteTarget?.title || "Selected task"}
            </p>
            <p className="mt-1 text-sm text-white/50">
              Status: {deleteTarget?.status?.replaceAll("_", " ")}
            </p>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleDeleteTask}
              disabled={isDeleting}
              className="rounded-xl bg-red-500 font-bold text-white hover:bg-red-400"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}