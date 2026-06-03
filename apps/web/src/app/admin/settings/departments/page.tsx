"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Filter,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment,
} from "@/services/master-data.service";
import { DepartmentOption } from "@/types/master-data.types";

type ApiErrorResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
};

type DepartmentFormState = {
  name: string;
  description: string;
};

const DEPARTMENTS_PER_PAGE = 10;

const initialDepartmentForm: DepartmentFormState = {
  name: "",
  description: "",
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<ApiErrorResponse>(error)) return fallback;

  if (!error.response) {
    return "Backend server is not reachable. Please check if API server is running.";
  }

  const statusCode = error.response.status;
  const data = error.response.data;

  if (statusCode === 401) return "Your session has expired. Please login again.";
  if (statusCode === 403) return "You do not have permission to perform this action.";
  if (statusCode === 404) return "Department API route not found. Please check backend routes.";
  if (statusCode >= 500) return "Server error while processing department request.";

  if (Array.isArray(data?.message)) return data.message[0] || fallback;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getDepartmentUniqueKey(department: DepartmentOption) {
  return department.id || department.name?.trim().toLowerCase() || "";
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="group overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
      <CardContent className="relative p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/5 blur-2xl transition group-hover:bg-amber-300/10" />

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm font-semibold text-white/55">{label}</p>
        <p className="mt-1 text-3xl font-black text-white">{value}</p>
        <p className="mt-2 text-xs leading-5 text-white/45">{description}</p>
      </CardContent>
    </Card>
  );
}

function DepartmentsLoading() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-48 rounded-[2rem] bg-white/10" />
      <Skeleton className="h-36 rounded-3xl bg-white/10" />
      <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
    </section>
  );
}

function EmptyState({ clearFilters }: { clearFilters: () => void }) {
  return (
    <div className="p-10">
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          <Building2 className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-black text-white">No departments found</h3>
        <p className="mt-2 text-sm leading-6 text-white/50">
          No department matched your current search. Clear filters and try
          again.
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

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<DepartmentFormState>(initialDepartmentForm);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedDepartment, setSelectedDepartment] =
    useState<DepartmentOption | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] =
    useState<DepartmentFormState>(initialDepartmentForm);
  const [isUpdating, setIsUpdating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DepartmentOption | null>(
    null
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDepartments = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      const data = await getDepartments();
      setDepartments(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch departments."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchDepartments(false);
    };

    void loadInitialData();
  }, [fetchDepartments]);

  /**
   * Duplicate-safe departments.
   * API data -> unique records -> summary -> search -> pagination -> display.
   */
  const uniqueDepartments = useMemo(() => {
    const departmentMap = new Map<string, DepartmentOption>();

    departments.forEach((department) => {
      const uniqueKey = getDepartmentUniqueKey(department);
      if (!uniqueKey) return;

      if (!departmentMap.has(uniqueKey)) {
        departmentMap.set(uniqueKey, department);
      }
    });

    return Array.from(departmentMap.values());
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    return uniqueDepartments.filter((department) => {
      const searchableText = [
        department.name,
        department.description,
        formatDate(department.createdAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return keyword ? searchableText.includes(keyword) : true;
    });
  }, [uniqueDepartments, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDepartments.length / DEPARTMENTS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * DEPARTMENTS_PER_PAGE;
  const endIndex = startIndex + DEPARTMENTS_PER_PAGE;
  const paginatedDepartments = filteredDepartments.slice(startIndex, endIndex);

  const updateCreateForm = (
    field: keyof DepartmentFormState,
    value: string
  ) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditForm = (field: keyof DepartmentFormState, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateDepartmentForm = (form: DepartmentFormState) => {
    if (!form.name.trim()) {
      toast.error("Department name is required.");
      return false;
    }

    if (form.name.trim().length < 2) {
      toast.error("Department name must be at least 2 characters.");
      return false;
    }

    return true;
  };

  const handleCreateDepartment = async () => {
    if (!validateDepartmentForm(createForm)) return;

    try {
      setIsCreating(true);

      await createDepartment({
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
      });

      toast.success("Department created successfully.");

      setCreateForm(initialDepartmentForm);
      setIsCreateOpen(false);
      setCurrentPage(1);

      await fetchDepartments(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to create department."));
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (department: DepartmentOption) => {
    setSelectedDepartment(department);
    setEditForm({
      name: department.name || "",
      description: department.description || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdateDepartment = async () => {
    if (!selectedDepartment) return;
    if (!validateDepartmentForm(editForm)) return;

    try {
      setIsUpdating(true);

      await updateDepartment(selectedDepartment.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
      });

      toast.success("Department updated successfully.");

      setSelectedDepartment(null);
      setEditForm(initialDepartmentForm);
      setIsEditOpen(false);

      await fetchDepartments(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update department."));
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteModal = (department: DepartmentOption) => {
    setDeleteTarget(department);
    setIsDeleteOpen(true);
  };

  const handleDeleteDepartment = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);

      await deleteDepartment(deleteTarget.id);

      toast.success("Department deleted successfully.");

      setDeleteTarget(null);
      setIsDeleteOpen(false);

      await fetchDepartments(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete department."));
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  if (isLoading) return <DepartmentsLoading />;

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
              Departments
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Manage Departments
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              Create and manage departments used in employee profiles, reports,
              attendance filters and HRMS analytics.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => fetchDepartments(true)}
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
                  Create Department
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                    Create Department
                  </DialogTitle>
                  <p className="text-sm text-white/50">
                    Add a new department for the company workforce.
                  </p>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Department Name</Label>
                    <Input
                      value={createForm.name}
                      onChange={(event) =>
                        updateCreateForm("name", event.target.value)
                      }
                      placeholder="Operations & Maintenance"
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={createForm.description}
                      onChange={(event) =>
                        updateCreateForm("description", event.target.value)
                      }
                      placeholder="Department description..."
                      className="min-h-28 border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
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
                    onClick={handleCreateDepartment}
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
                        Create Department
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Departments"
          value={uniqueDepartments.length}
          description="Unique departments available."
          icon={Building2}
        />
      </div>

      {/* List */}
      <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
        <CardContent className="p-0">
          {/* Filters */}
          <div className="space-y-4 border-b border-white/10 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                  <Filter className="h-3.5 w-3.5" />
                  Department Directory
                </div>

                <h2 className="text-xl font-black text-white">
                  Department List
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Showing{" "}
                  {filteredDepartments.length === 0 ? 0 : startIndex + 1}-
                  {Math.min(endIndex, filteredDepartments.length)} of{" "}
                  {filteredDepartments.length} departments
                </p>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-[1fr_auto] xl:max-w-xl">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search department..."
                    className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/35"
                  />
                </div>

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
          <div className="hidden border-b border-white/10 px-5 py-4 lg:grid lg:grid-cols-[1.2fr_1.8fr_1fr_1fr] lg:gap-4">
            <p className="text-sm font-bold text-white/50">Department</p>
            <p className="text-sm font-bold text-white/50">Description</p>
            <p className="text-sm font-bold text-white/50">Created</p>
            <p className="text-right text-sm font-bold text-white/50">
              Actions
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {filteredDepartments.length === 0 ? (
              <EmptyState clearFilters={clearFilters} />
            ) : (
              paginatedDepartments.map((department) => (
                <div
                  key={getDepartmentUniqueKey(department)}
                  className="grid gap-5 p-5 hover:bg-white/[0.025] lg:grid-cols-[1.2fr_1.8fr_1fr_1fr] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/40 lg:hidden">
                      Department
                    </p>
                    <p className="break-words font-black text-white">
                      {department.name}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      ID: {department.id.slice(0, 8)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40 lg:hidden">
                      Description
                    </p>
                    <p className="line-clamp-2 break-words text-sm text-white/65">
                      {department.description || "No description"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-white/40 lg:hidden">
                      Created
                    </p>
                    <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">
                      <CalendarDays className="mr-1 h-3.5 w-3.5" />
                      {formatDate(department.createdAt)}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(department)}
                      className="rounded-xl border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteModal(department)}
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
              Page {safeCurrentPage} of {totalPages} • {DEPARTMENTS_PER_PAGE}{" "}
              departments per page
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

      {/* Note */}
      <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">
                Duplicate-safe Department Display
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                This page shows unique departments only. Duplicate rows from API
                response are filtered before summary, search and list rendering.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Edit Department
            </DialogTitle>
            <p className="text-sm text-white/50">
              Update department name and description.
            </p>
          </DialogHeader>

          {selectedDepartment ? (
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-2">
              <DetailPill
                icon={Building2}
                label="Department"
                value={selectedDepartment.name}
              />
              <DetailPill
                icon={CalendarDays}
                label="Created"
                value={formatDate(selectedDepartment.createdAt)}
              />
            </div>
          ) : null}

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input
                value={editForm.name}
                onChange={(event) => updateEditForm("name", event.target.value)}
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(event) =>
                  updateEditForm("description", event.target.value)
                }
                className="min-h-28 border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
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
              onClick={handleUpdateDepartment}
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

      {/* Delete modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-red-300/20 bg-[#17100b] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-100">
              Delete Department
            </DialogTitle>
            <p className="text-sm text-white/50">
              Backend may block delete if this department is already assigned to
              employees.
            </p>
          </DialogHeader>

          <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4">
            <p className="font-bold text-white">
              {deleteTarget?.name || "Selected department"}
            </p>
            <p className="mt-1 text-sm text-white/50">
              {deleteTarget?.description || "No description"}
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
              onClick={handleDeleteDepartment}
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