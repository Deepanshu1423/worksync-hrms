"use client";

import { useCallback, useEffect, useMemo, useState, type ElementType } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Edit,
  Filter,
  FolderKanban,
  Loader2,
  PauseCircle,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
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

import {
  createProject,
  deleteProject,
  getAllProjects,
  updateProject,
} from "@/services/project.service";
import { Project, ProjectStatus } from "@/types/project.types";

type ApiErrorResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
};

type ProjectFilterStatus = "ALL" | ProjectStatus;

type ProjectFormState = {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
};

const PROJECTS_PER_PAGE = 10;

const initialProjectForm: ProjectFormState = {
  name: "",
  description: "",
  status: "ACTIVE",
  startDate: "",
  endDate: "",
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
    return "You do not have permission to perform this project action.";
  }

  if (statusCode === 404) {
    return "Project API route not found. Please check backend project routes.";
  }

  if (statusCode >= 500) {
    return "Server error while processing project request. Please try again later.";
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
 * Primary key should be project.id.
 * Fallback key prevents duplicate UI if backend accidentally sends
 * records without id.
 */
function getProjectUniqueKey(project: Project) {
  return (
    project.id ||
    [
      project.name,
      project.status,
      project.startDate,
      project.endDate,
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
 * Returns badge design according to project status.
 */
function getProjectStatusBadgeClass(status: string) {
  if (status === "ACTIVE") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (status === "PLANNED") {
    return "border-sky-300/20 bg-sky-300/10 text-sky-200";
  }

  if (status === "ON_HOLD") {
    return "border-orange-300/20 bg-orange-300/10 text-orange-200";
  }

  if (status === "COMPLETED") {
    return "border-purple-300/20 bg-purple-300/10 text-purple-200";
  }

  if (status === "CANCELLED") {
    return "border-red-300/20 bg-red-300/10 text-red-200";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

/**
 * Summary card for project counts.
 */
function ProjectSummaryCard({
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
 * Skeleton loading UI for projects page.
 */
function ProjectsLoading() {
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
 * Better empty state for projects page.
 */
function EmptyProjectsState({ clearFilters }: { clearFilters: () => void }) {
  return (
    <div className="p-10">
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          <FolderKanban className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-black text-white">No projects found</h3>
        <p className="mt-2 text-sm leading-6 text-white/50">
          No project matched your current search or status filter. Clear filters
          and try again.
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ProjectFilterStatus>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<ProjectFormState>(initialProjectForm);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] =
    useState<ProjectFormState>(initialProjectForm);
  const [isUpdating, setIsUpdating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetches projects from backend.
   */
  const fetchProjects = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const data = await getAllProjects();

      setProjects(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch projects."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initial API call.
   */
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchProjects(false);
    };

    void loadInitialData();
  }, [fetchProjects]);

  /**
   * Duplicate-safe projects.
   *
   * Important:
   * Always use this array for summary, filters and display.
   * This prevents duplicate projects from showing on UI even if API sends
   * duplicate rows accidentally.
   */
  const uniqueProjects = useMemo(() => {
    const projectMap = new Map<string, Project>();

    projects.forEach((project) => {
      const uniqueKey = getProjectUniqueKey(project);

      if (!uniqueKey) return;

      if (!projectMap.has(uniqueKey)) {
        projectMap.set(uniqueKey, project);
      }
    });

    return Array.from(projectMap.values());
  }, [projects]);

  /**
   * Project summary cards.
   */
  const projectSummary = useMemo(() => {
    return {
      total: uniqueProjects.length,
      active: uniqueProjects.filter((project) => project.status === "ACTIVE")
        .length,
      onHold: uniqueProjects.filter((project) => project.status === "ON_HOLD")
        .length,
      completed: uniqueProjects.filter(
        (project) => project.status === "COMPLETED"
      ).length,
      cancelled: uniqueProjects.filter(
        (project) => project.status === "CANCELLED"
      ).length,
    };
  }, [uniqueProjects]);

  /**
   * Search + status filter.
   */
  const filteredProjects = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    return uniqueProjects.filter((project) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : project.status === statusFilter;

      const searchableText = [
        project.name,
        project.description,
        project.status,
        project.startDate,
        project.endDate,
        formatDate(project.startDate),
        formatDate(project.endDate),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;

      return matchesStatus && matchesSearch;
    });
  }, [uniqueProjects, searchTerm, statusFilter]);

  /**
   * Pagination calculation.
   * Only 10 projects will show per page.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * PROJECTS_PER_PAGE;
  const endIndex = startIndex + PROJECTS_PER_PAGE;

  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  /**
   * Updates create form value.
   */
  const updateCreateForm = (field: keyof ProjectFormState, value: string) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Updates edit form value.
   */
  const updateEditForm = (field: keyof ProjectFormState, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Common project form validation for create/edit.
   */
  const validateProjectForm = (form: ProjectFormState) => {
    if (!form.name.trim()) {
      toast.error("Project name is required.");
      return false;
    }

    if (form.name.trim().length < 3) {
      toast.error("Project name must be at least 3 characters.");
      return false;
    }

    if (form.startDate && form.endDate) {
      const startDate = new Date(form.startDate);
      const endDate = new Date(form.endDate);

      if (endDate < startDate) {
        toast.error("End date cannot be before start date.");
        return false;
      }
    }

    return true;
  };

  /**
   * Creates a new project.
   */
  const handleCreateProject = async () => {
    if (!validateProjectForm(createForm)) return;

    try {
      setIsCreating(true);

      await createProject({
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        status: createForm.status,
        startDate: createForm.startDate || null,
        endDate: createForm.endDate || null,
      });

      toast.success("Project created successfully.");

      setCreateForm(initialProjectForm);
      setIsCreateOpen(false);
      setCurrentPage(1);

      await fetchProjects(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to create project."));
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Opens edit modal with selected project values.
   */
  const openEditModal = (project: Project) => {
    setSelectedProject(project);

    setEditForm({
      name: project.name || "",
      description: project.description || "",
      status: project.status as ProjectStatus,
      startDate: toDateInputValue(project.startDate),
      endDate: toDateInputValue(project.endDate),
    });

    setIsEditOpen(true);
  };

  /**
   * Updates selected project.
   */
  const handleUpdateProject = async () => {
    if (!selectedProject) return;
    if (!validateProjectForm(editForm)) return;

    try {
      setIsUpdating(true);

      await updateProject(selectedProject.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        status: editForm.status,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null,
      });

      toast.success("Project updated successfully.");

      setSelectedProject(null);
      setEditForm(initialProjectForm);
      setIsEditOpen(false);

      await fetchProjects(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update project."));
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Opens delete confirmation modal.
   */
  const openDeleteModal = (project: Project) => {
    setDeleteTarget(project);
    setIsDeleteOpen(true);
  };

  /**
   * Deletes selected project.
   *
   * Backend may block delete if project has members/tasks.
   */
  const handleDeleteProject = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);

      await deleteProject(deleteTarget.id);

      toast.success("Project deleted successfully.");

      setDeleteTarget(null);
      setIsDeleteOpen(false);

      await fetchProjects(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete project."));
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Clears filters and resets pagination.
   */
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  if (isLoading) {
    return <ProjectsLoading />;
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
              Project Management
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Manage Internal Projects
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              Create and manage internal HRMS work projects for plant
              operations, O&M teams, project execution and office coordination.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => fetchProjects(true)}
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
                  Create Project
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                    Create New Project
                  </DialogTitle>
                  <p className="text-sm text-white/50">
                    Add project details, timeline and current status.
                  </p>
                </DialogHeader>

                <div className="grid gap-4 pt-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Project Name</Label>
                    <Input
                      value={createForm.name}
                      onChange={(event) =>
                        updateCreateForm("name", event.target.value)
                      }
                      placeholder="O&M Team Weekly Work Plan"
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
                      placeholder="Describe project purpose..."
                      className="min-h-28 border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={createForm.status}
                      onValueChange={(value) =>
                        updateCreateForm("status", value)
                      }
                    >
                      <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>

                      <SelectContent className="border-white/10 bg-[#17100b] text-white">
                        <SelectItem value="PLANNED">Planned</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ON_HOLD">On Hold</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={createForm.startDate}
                      onChange={(event) =>
                        updateCreateForm("startDate", event.target.value)
                      }
                      className="border-white/10 bg-white/[0.04] text-white"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={createForm.endDate}
                      onChange={(event) =>
                        updateCreateForm("endDate", event.target.value)
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
                    onClick={handleCreateProject}
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
                        Create Project
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ProjectSummaryCard
          label="Total Projects"
          value={projectSummary.total}
          description="Unique projects available."
          icon={BriefcaseBusiness}
        />

        <ProjectSummaryCard
          label="Active"
          value={projectSummary.active}
          description="Currently active projects."
          icon={CheckCircle2}
          tone="success"
        />

        <ProjectSummaryCard
          label="On Hold"
          value={projectSummary.onHold}
          description="Projects temporarily paused."
          icon={PauseCircle}
          tone="warning"
        />

        <ProjectSummaryCard
          label="Completed"
          value={projectSummary.completed}
          description="Projects marked completed."
          icon={Clock3}
          tone="info"
        />

        <ProjectSummaryCard
          label="Cancelled"
          value={projectSummary.cancelled}
          description="Projects marked cancelled."
          icon={XCircle}
          tone="danger"
        />
      </div>

      {/* Project list */}
      <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
        <CardContent className="p-0">
          {/* Filters */}
          <div className="space-y-4 border-b border-white/10 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                  <Filter className="h-3.5 w-3.5" />
                  Project Directory
                </div>

                <h2 className="text-xl font-black text-white">Project List</h2>
                <p className="mt-1 text-sm text-white/50">
                  Showing {filteredProjects.length === 0 ? 0 : startIndex + 1}-
                  {Math.min(endIndex, filteredProjects.length)} of{" "}
                  {filteredProjects.length} projects
                </p>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-[1.5fr_1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search project..."
                    className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/35"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as ProjectFilterStatus);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-11 border-white/10 bg-white/[0.04] text-white">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>

                  <SelectContent className="border-white/10 bg-[#17100b] text-white">
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
          <div className="hidden border-b border-white/10 px-5 py-4 xl:grid xl:grid-cols-[1.4fr_1.4fr_0.85fr_1fr_1fr_1fr] xl:gap-4">
            <p className="text-sm font-bold text-white/50">Project</p>
            <p className="text-sm font-bold text-white/50">Description</p>
            <p className="text-sm font-bold text-white/50">Status</p>
            <p className="text-sm font-bold text-white/50">Start Date</p>
            <p className="text-sm font-bold text-white/50">End Date</p>
            <p className="text-right text-sm font-bold text-white/50">
              Actions
            </p>
          </div>

          {/* Responsive project list */}
          <div className="divide-y divide-white/10">
            {filteredProjects.length === 0 ? (
              <EmptyProjectsState clearFilters={clearFilters} />
            ) : (
              paginatedProjects.map((project) => (
                <div
                  key={getProjectUniqueKey(project)}
                  className="grid gap-5 p-5 hover:bg-white/[0.025] xl:grid-cols-[1.4fr_1.4fr_0.85fr_1fr_1fr_1fr] xl:items-center xl:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/40 xl:hidden">Project</p>
                    <p className="break-words font-black text-white">
                      {project.name}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      ID: {project.id.slice(0, 8)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40 xl:hidden">
                      Description
                    </p>
                    <p className="line-clamp-2 break-words text-sm text-white/65">
                      {project.description || "No description"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-white/40 xl:hidden">
                      Status
                    </p>
                    <Badge className={getProjectStatusBadgeClass(project.status)}>
                      {project.status.replaceAll("_", " ")}
                    </Badge>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-white/40 xl:hidden">
                      Start Date
                    </p>
                    <p className="flex items-center gap-2 text-sm text-white/70">
                      <CalendarDays className="h-4 w-4 shrink-0 text-amber-300" />
                      {formatDate(project.startDate)}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-white/40 xl:hidden">
                      End Date
                    </p>
                    <p className="flex items-center gap-2 text-sm text-white/70">
                      <CalendarDays className="h-4 w-4 shrink-0 text-amber-300" />
                      {formatDate(project.endDate)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(project)}
                      className="rounded-xl border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteModal(project)}
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
              Page {safeCurrentPage} of {totalPages} • {PROJECTS_PER_PAGE}{" "}
              projects per page
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
                Duplicate-safe Project Display
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                This page shows unique projects only. Duplicate rows from API
                response are filtered before summary, search and list rendering.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Project Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Edit Project
            </DialogTitle>
            <p className="text-sm text-white/50">
              Update project details, status and timeline.
            </p>
          </DialogHeader>

          {selectedProject ? (
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-2">
              <DetailPill
                icon={FolderKanban}
                label="Project"
                value={selectedProject.name}
              />
              <DetailPill
                icon={CalendarDays}
                label="Timeline"
                value={`${formatDate(selectedProject.startDate)} - ${formatDate(
                  selectedProject.endDate
                )}`}
              />
            </div>
          ) : null}

          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Project Name</Label>
              <Input
                value={editForm.name}
                onChange={(event) =>
                  updateEditForm("name", event.target.value)
                }
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
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => updateEditForm("status", value)}
              >
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#17100b] text-white">
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={editForm.startDate}
                onChange={(event) =>
                  updateEditForm("startDate", event.target.value)
                }
                className="border-white/10 bg-white/[0.04] text-white"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={editForm.endDate}
                onChange={(event) =>
                  updateEditForm("endDate", event.target.value)
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
              onClick={handleUpdateProject}
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

      {/* Delete Project Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-red-300/20 bg-[#17100b] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-100">
              Delete Project
            </DialogTitle>
            <p className="text-sm text-white/50">
              This action will permanently remove the selected project if
              backend allows it.
            </p>
          </DialogHeader>

          <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4">
            <p className="font-bold text-white">
              {deleteTarget?.name || "Selected project"}
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
              onClick={handleDeleteProject}
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