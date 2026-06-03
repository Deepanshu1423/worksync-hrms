"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
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
  createDesignation,
  deleteDesignation,
  getDesignations,
  updateDesignation,
} from "@/services/master-data.service";
import { DesignationOption } from "@/types/master-data.types";

type ApiErrorResponse = {
  message?: string;
};

type DesignationFormState = {
  name: string;
  description: string;
};

const DESIGNATIONS_PER_PAGE = 10;

const initialDesignationForm: DesignationFormState = {
  name: "",
  description: "",
};

/**
 * Extracts readable backend error message safely.
 * This avoids using `any` in catch blocks.
 */
function getApiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
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
 * Reusable summary card for designation counts.
 */
function DesignationSummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
      <CardContent className="p-5">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm text-white/55">{label}</p>
        <p className="mt-1 text-2xl font-black text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Loading UI while designations are being fetched.
 */
function DesignationsLoading() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-40 rounded-[2rem] bg-white/10" />
      <Skeleton className="h-32 rounded-3xl bg-white/10" />
      <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
    </section>
  );
}

export default function DesignationsPage() {
  const [designations, setDesignations] = useState<DesignationOption[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<DesignationFormState>(initialDesignationForm);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedDesignation, setSelectedDesignation] =
    useState<DesignationOption | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] =
    useState<DesignationFormState>(initialDesignationForm);
  const [isUpdating, setIsUpdating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DesignationOption | null>(
    null
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetch designations from backend.
   */
  const fetchDesignations = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const data = await getDesignations();

      setDesignations(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch designations"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initial API call.
   */
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchDesignations(false);
    };

    loadInitialData();
  }, [fetchDesignations]);

  /**
   * Search designations by name and description.
   */
  const filteredDesignations = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    if (!keyword) return designations;

    return designations.filter((designation) => {
      const searchableText = [designation.name, designation.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [designations, searchTerm]);

  /**
   * Pagination calculation.
   * Only 10 designations will show per page.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredDesignations.length / DESIGNATIONS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * DESIGNATIONS_PER_PAGE;
  const endIndex = startIndex + DESIGNATIONS_PER_PAGE;

  const paginatedDesignations = filteredDesignations.slice(
    startIndex,
    endIndex
  );

  /**
   * Updates create form value.
   */
  const updateCreateForm = (
    field: keyof DesignationFormState,
    value: string
  ) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Updates edit form value.
   */
  const updateEditForm = (field: keyof DesignationFormState, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Common validation for create/edit designation form.
   */
  const validateDesignationForm = (form: DesignationFormState) => {
    if (!form.name.trim()) {
      toast.error("Designation name is required");
      return false;
    }

    if (form.name.trim().length < 2) {
      toast.error("Designation name must be at least 2 characters");
      return false;
    }

    return true;
  };

  /**
   * Creates a new designation.
   */
  const handleCreateDesignation = async () => {
    if (!validateDesignationForm(createForm)) return;

    try {
      setIsCreating(true);

      await createDesignation({
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
      });

      toast.success("Designation created successfully");

      setCreateForm(initialDesignationForm);
      setIsCreateOpen(false);
      setCurrentPage(1);

      await fetchDesignations(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to create designation"));
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Opens edit modal with selected designation data.
   */
  const openEditModal = (designation: DesignationOption) => {
    setSelectedDesignation(designation);

    setEditForm({
      name: designation.name || "",
      description: designation.description || "",
    });

    setIsEditOpen(true);
  };

  /**
   * Updates selected designation.
   */
  const handleUpdateDesignation = async () => {
    if (!selectedDesignation) return;
    if (!validateDesignationForm(editForm)) return;

    try {
      setIsUpdating(true);

      await updateDesignation(selectedDesignation.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
      });

      toast.success("Designation updated successfully");

      setSelectedDesignation(null);
      setEditForm(initialDesignationForm);
      setIsEditOpen(false);

      await fetchDesignations(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update designation"));
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Opens delete confirmation modal.
   */
  const openDeleteModal = (designation: DesignationOption) => {
    setDeleteTarget(designation);
    setIsDeleteOpen(true);
  };

  /**
   * Deletes selected designation.
   *
   * Backend may block delete if designation is already assigned to employees.
   */
  const handleDeleteDesignation = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);

      await deleteDesignation(deleteTarget.id);

      toast.success("Designation deleted successfully");

      setDeleteTarget(null);
      setIsDeleteOpen(false);

      await fetchDesignations(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete designation"));
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Clears search filter.
   */
  const clearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  if (isLoading) {
    return <DesignationsLoading />;
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-[2rem] border border-amber-200/30 bg-[#17100b]/75 p-6 shadow-2xl shadow-black/30 sm:p-8"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-300">
              <BadgeCheck className="h-4 w-4" />
              Designations
            </p>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Manage Designations
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
              Create and manage employee designations used in employee profiles,
              HR reports, attendance views and task assignments.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => fetchDesignations(true)}
              variant="outline"
              className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 rounded-xl bg-amber-400 px-5 font-bold text-black hover:bg-amber-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Designation
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                    Create Designation
                  </DialogTitle>
                  <p className="text-sm text-white/50">
                    Add a new designation for company employees.
                  </p>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Designation Name</Label>
                    <Input
                      value={createForm.name}
                      onChange={(event) =>
                        updateCreateForm("name", event.target.value)
                      }
                      placeholder="O&M Engineer"
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
                      placeholder="Designation description..."
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
                    onClick={handleCreateDesignation}
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
                        Create Designation
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
        <DesignationSummaryCard
          label="Total Designations"
          value={designations.length}
          icon={BadgeCheck}
        />
      </div>

      {/* Designation list */}
      <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
        <CardContent className="p-0">
          {/* Filters */}
          <div className="space-y-4 border-b border-white/10 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">
                  Designation List
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Showing{" "}
                  {filteredDesignations.length === 0 ? 0 : startIndex + 1}-
                  {Math.min(endIndex, filteredDesignations.length)} of{" "}
                  {filteredDesignations.length} designations
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
                    placeholder="Search designation..."
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
            <p className="text-sm font-bold text-white/50">Designation</p>
            <p className="text-sm font-bold text-white/50">Description</p>
            <p className="text-sm font-bold text-white/50">Created</p>
            <p className="text-right text-sm font-bold text-white/50">
              Actions
            </p>
          </div>

          {/* Responsive list */}
          <div className="divide-y divide-white/10">
            {filteredDesignations.length === 0 ? (
              <div className="p-10 text-center text-white/50">
                No designations found.
              </div>
            ) : (
              paginatedDesignations.map((designation) => (
                <div
                  key={designation.id}
                  className="grid gap-5 p-5 hover:bg-white/[0.025] lg:grid-cols-[1.2fr_1.8fr_1fr_1fr] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/40 lg:hidden">
                      Designation
                    </p>
                    <p className="break-words font-bold text-white">
                      {designation.name}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      ID: {designation.id.slice(0, 8)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40 lg:hidden">
                      Description
                    </p>
                    <p className="line-clamp-2 break-words text-sm text-white/65">
                      {designation.description || "No description"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-white/40 lg:hidden">Created</p>
                    <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">
                      {formatDate(designation.createdAt)}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(designation)}
                      className="rounded-xl border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteModal(designation)}
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
              Page {safeCurrentPage} of {totalPages} •{" "}
              {DESIGNATIONS_PER_PAGE} designations per page
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

      {/* Edit Designation Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Edit Designation
            </DialogTitle>
            <p className="text-sm text-white/50">
              Update designation name and description.
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Designation Name</Label>
              <Input
                value={editForm.name}
                onChange={(event) =>
                  updateEditForm("name", event.target.value)
                }
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
              onClick={handleUpdateDesignation}
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

      {/* Delete Designation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-red-300/20 bg-[#17100b] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-100">
              Delete Designation
            </DialogTitle>
            <p className="text-sm text-white/50">
              This action will delete the designation if backend allows it.
            </p>
          </DialogHeader>

          <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4">
            <p className="font-bold text-white">
              {deleteTarget?.name || "Selected designation"}
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
              onClick={handleDeleteDesignation}
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