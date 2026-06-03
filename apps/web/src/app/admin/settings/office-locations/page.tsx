"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Power,
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
  createOfficeLocation,
  deleteOfficeLocation,
  getOfficeLocations,
  updateOfficeLocation,
  updateOfficeLocationStatus,
} from "@/services/office-location.service";
import { OfficeLocation } from "@/types/office-location.types";

type ApiErrorResponse = {
  message?: string;
};

type OfficeLocationFormState = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
};

const OFFICE_LOCATIONS_PER_PAGE = 10;

const initialLocationForm: OfficeLocationFormState = {
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  radiusMeters: "100",
};

/**
 * Extract readable backend error message safely.
 */
function getApiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
}

/**
 * Format date for UI.
 */
function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

/**
 * Build Google Maps link from latitude and longitude.
 */
function getMapUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Returns office location id safely.
 *
 * Important:
 * We are not checking UUID here because backend id may not be UUID format.
 */
function getOfficeLocationId(location: OfficeLocation) {
  const possibleIds = [
    location.id,
    location.officeLocationId,
    location.locationId,
    location._id,
  ]
    .filter(Boolean)
    .map(String);

  return possibleIds[0] || "";
}

/**
 * Returns radius value safely.
 *
 * Backend field: allowedRadius
 * Frontend field: radiusMeters
 */
function getOfficeLocationRadius(location: OfficeLocation) {
  return (
    location.radiusMeters ??
    location.allowedRadius ??
    location.radius ??
    location.allowedRadiusMeters ??
    100
  );
}

/**
 * Allow only valid latitude/longitude characters.
 */
function sanitizeCoordinateInput(value: string) {
  return value.replace(/[^0-9.-]/g, "");
}

/**
 * Allow only digits for radius field.
 */
function sanitizeRadiusInput(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Summary card.
 */
function OfficeLocationSummaryCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass = {
    default: "bg-amber-300/10 text-amber-300",
    success: "bg-emerald-300/10 text-emerald-300",
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

/**
 * Loading skeleton.
 */
function OfficeLocationsLoading() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-40 rounded-[2rem] bg-white/10" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-3xl bg-white/10" />
        ))}
      </div>

      <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
    </section>
  );
}

export default function OfficeLocationsPage() {
  const [locations, setLocations] = useState<OfficeLocation[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<OfficeLocationFormState>(initialLocationForm);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedLocation, setSelectedLocation] =
    useState<OfficeLocation | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] =
    useState<OfficeLocationFormState>(initialLocationForm);
  const [isUpdating, setIsUpdating] = useState(false);

  const [statusTarget, setStatusTarget] = useState<OfficeLocation | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<OfficeLocation | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetch office locations from backend.
   */
  const fetchLocations = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const data = await getOfficeLocations();
      setLocations(data);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "Failed to fetch office locations")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initial page load.
   */
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchLocations(false);
    };

    loadInitialData();
  }, [fetchLocations]);

  /**
   * Summary cards.
   */
  const locationSummary = useMemo(() => {
    return {
      total: locations.length,
      active: locations.filter((location) => location.isActive).length,
      inactive: locations.filter((location) => !location.isActive).length,
    };
  }, [locations]);

  /**
   * Search locations by name/address/coordinates/status.
   */
  const filteredLocations = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    if (!keyword) return locations;

    return locations.filter((location) => {
      const searchableText = [
        location.name,
        location.address,
        String(location.latitude),
        String(location.longitude),
        String(getOfficeLocationRadius(location)),
        location.isActive ? "active" : "inactive",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [locations, searchTerm]);

  /**
   * Pagination calculation.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredLocations.length / OFFICE_LOCATIONS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * OFFICE_LOCATIONS_PER_PAGE;
  const endIndex = startIndex + OFFICE_LOCATIONS_PER_PAGE;

  const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

  /**
   * Update create form.
   */
  const updateCreateForm = (
    field: keyof OfficeLocationFormState,
    value: string
  ) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Update edit form.
   */
  const updateEditForm = (
    field: keyof OfficeLocationFormState,
    value: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Common validation for create/edit form.
   */
  const validateLocationForm = (form: OfficeLocationFormState) => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radiusMeters = Number(form.radiusMeters);

    if (!form.name.trim()) {
      toast.error("Location name is required");
      return false;
    }

    if (!form.latitude.trim()) {
      toast.error("Latitude is required");
      return false;
    }

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      toast.error("Latitude must be a valid number between -90 and 90");
      return false;
    }

    if (!form.longitude.trim()) {
      toast.error("Longitude is required");
      return false;
    }

    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      toast.error("Longitude must be a valid number between -180 and 180");
      return false;
    }

    if (!form.radiusMeters.trim()) {
      toast.error("Reference radius is required");
      return false;
    }

    if (Number.isNaN(radiusMeters) || radiusMeters <= 0) {
      toast.error("Reference radius must be greater than 0");
      return false;
    }

    return true;
  };

  /**
   * Create office / plant site location.
   *
   * Note:
   * Attendance is not restricted by this radius.
   */
  const handleCreateLocation = async () => {
    if (!validateLocationForm(createForm)) return;

    try {
      setIsCreating(true);

      await createOfficeLocation({
        name: createForm.name.trim(),
        address: createForm.address.trim() || null,
        latitude: Number(createForm.latitude),
        longitude: Number(createForm.longitude),
        radiusMeters: Number(createForm.radiusMeters),
        isActive: true,
      });

      toast.success("Office location created successfully");

      setCreateForm(initialLocationForm);
      setIsCreateOpen(false);
      setCurrentPage(1);

      await fetchLocations(false);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "Failed to create office location")
      );
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Open edit modal with selected location data.
   */
  const openEditModal = (location: OfficeLocation) => {
    setSelectedLocation(location);

    setEditForm({
      name: location.name || "",
      address: location.address || "",
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      radiusMeters: String(getOfficeLocationRadius(location)),
    });

    setIsEditOpen(true);
  };

  /**
   * Update selected location.
   */
  const handleUpdateLocation = async () => {
    if (!selectedLocation) return;
    if (!validateLocationForm(editForm)) return;

    const locationId = getOfficeLocationId(selectedLocation);

    if (!locationId) {
      console.log("Selected office location object:", selectedLocation);
      toast.error("Office location id missing. Please refresh and try again.");
      return;
    }

    try {
      setIsUpdating(true);

      await updateOfficeLocation(locationId, {
        name: editForm.name.trim(),
        address: editForm.address.trim() || null,
        latitude: Number(editForm.latitude),
        longitude: Number(editForm.longitude),
        radiusMeters: Number(editForm.radiusMeters),
      });

      toast.success("Office location updated successfully");

      setSelectedLocation(null);
      setEditForm(initialLocationForm);
      setIsEditOpen(false);

      await fetchLocations(false);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "Failed to update office location")
      );
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Open activate/deactivate confirmation modal.
   */
  const openStatusModal = (location: OfficeLocation) => {
    setStatusTarget(location);
    setIsStatusOpen(true);
  };

  /**
   * Activate / deactivate location.
   */
  const handleUpdateStatus = async () => {
    if (!statusTarget) return;

    const locationId = getOfficeLocationId(statusTarget);

    if (!locationId) {
      console.log("Selected office location object:", statusTarget);
      toast.error("Office location id missing. Please refresh and try again.");
      return;
    }

    try {
      setIsStatusUpdating(true);

      await updateOfficeLocationStatus(locationId, {
        isActive: !statusTarget.isActive,
      });

      toast.success(
        statusTarget.isActive
          ? "Office location deactivated"
          : "Office location activated"
      );

      setStatusTarget(null);
      setIsStatusOpen(false);

      await fetchLocations(false);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "Failed to update location status")
      );
    } finally {
      setIsStatusUpdating(false);
    }
  };

  /**
   * Open delete confirmation modal.
   */
  const openDeleteModal = (location: OfficeLocation) => {
    setDeleteTarget(location);
    setIsDeleteOpen(true);
  };

  /**
   * Delete selected location.
   */
  const handleDeleteLocation = async () => {
    if (!deleteTarget) return;

    const locationId = getOfficeLocationId(deleteTarget);

    if (!locationId) {
      console.log("Selected office location object:", deleteTarget);
      toast.error("Office location id missing. Please refresh and try again.");
      return;
    }

    try {
      setIsDeleting(true);

      await deleteOfficeLocation(locationId);

      toast.success("Office location deleted successfully");

      setDeleteTarget(null);
      setIsDeleteOpen(false);

      await fetchLocations(false);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "Failed to delete office location")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Clear search filter.
   */
  const clearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  if (isLoading) {
    return <OfficeLocationsLoading />;
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
              <MapPin className="h-4 w-4" />
              Office Locations
            </p>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Manage Office / Plant Sites
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
              Manage company offices and plant sites. Employee attendance is not
              restricted to these locations; actual check-in/check-out latitude,
              longitude and address will still be shown in Attendance.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => fetchLocations(true)}
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
                  Create Location
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                    Create Office Location
                  </DialogTitle>
                  <p className="text-sm text-white/50">
                    Add office or plant site coordinates for reference.
                  </p>
                </DialogHeader>

                <div className="grid gap-4 pt-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Location Name</Label>
                    <Input
                      value={createForm.name}
                      onChange={(event) =>
                        updateCreateForm("name", event.target.value)
                      }
                      placeholder="Noida Plant Office"
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Address</Label>
                    <Textarea
                      value={createForm.address}
                      onChange={(event) =>
                        updateCreateForm("address", event.target.value)
                      }
                      placeholder="Noida, Uttar Pradesh"
                      className="min-h-24 border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input
                      inputMode="decimal"
                      value={createForm.latitude}
                      onChange={(event) =>
                        updateCreateForm(
                          "latitude",
                          sanitizeCoordinateInput(event.target.value)
                        )
                      }
                      placeholder="28.6139"
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input
                      inputMode="decimal"
                      value={createForm.longitude}
                      onChange={(event) =>
                        updateCreateForm(
                          "longitude",
                          sanitizeCoordinateInput(event.target.value)
                        )
                      }
                      placeholder="77.2090"
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Reference Radius Meters</Label>
                    <Input
                      inputMode="numeric"
                      value={createForm.radiusMeters}
                      onChange={(event) =>
                        updateCreateForm(
                          "radiusMeters",
                          sanitizeRadiusInput(event.target.value)
                        )
                      }
                      placeholder="100"
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                    <p className="text-xs text-white/45">
                      This is for reference only. Attendance is not blocked
                      outside this radius.
                    </p>
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
                    onClick={handleCreateLocation}
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
                        Create Location
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <OfficeLocationSummaryCard
          label="Total Locations"
          value={locationSummary.total}
          icon={MapPin}
        />

        <OfficeLocationSummaryCard
          label="Active Locations"
          value={locationSummary.active}
          icon={Power}
          tone="success"
        />

        <OfficeLocationSummaryCard
          label="Inactive Locations"
          value={locationSummary.inactive}
          icon={Power}
          tone="danger"
        />
      </div>

      {/* Location list */}
      <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
        <CardContent className="p-0">
          {/* Filters */}
          <div className="space-y-4 border-b border-white/10 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">
                  Location List
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Showing {filteredLocations.length === 0 ? 0 : startIndex + 1}
                  -{Math.min(endIndex, filteredLocations.length)} of{" "}
                  {filteredLocations.length} locations
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
                    placeholder="Search location..."
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
          <div className="hidden border-b border-white/10 px-5 py-4 xl:grid xl:grid-cols-[1.3fr_1.5fr_1fr_0.8fr_1.2fr] xl:gap-4">
            <p className="text-sm font-bold text-white/50">Location</p>
            <p className="text-sm font-bold text-white/50">Address</p>
            <p className="text-sm font-bold text-white/50">Coordinates</p>
            <p className="text-sm font-bold text-white/50">Status</p>
            <p className="text-right text-sm font-bold text-white/50">
              Actions
            </p>
          </div>

          {/* Responsive list */}
          <div className="divide-y divide-white/10">
            {filteredLocations.length === 0 ? (
              <div className="p-10 text-center text-white/50">
                No office locations found.
              </div>
            ) : (
              paginatedLocations.map((location) => (
                <div
                  key={
                    getOfficeLocationId(location) ||
                    `${location.name}-${location.latitude}-${location.longitude}`
                  }
                  className="grid gap-5 p-5 hover:bg-white/[0.025] xl:grid-cols-[1.3fr_1.5fr_1fr_0.8fr_1.2fr] xl:items-center xl:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/40 xl:hidden">Location</p>
                    <p className="break-words font-bold text-white">
                      {location.name}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      Radius: {getOfficeLocationRadius(location)}m
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      Created: {formatDate(location.createdAt)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40 xl:hidden">Address</p>
                    <p className="line-clamp-2 break-words text-sm text-white/65">
                      {location.address || "No address"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40 xl:hidden">
                      Coordinates
                    </p>
                    <p className="break-words text-sm font-semibold text-white/75">
                      {location.latitude}, {location.longitude}
                    </p>

                    <a
                      href={getMapUrl(location.latitude, location.longitude)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center text-xs font-bold text-amber-300 hover:text-amber-200"
                    >
                      Open Map
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-white/40 xl:hidden">
                      Status
                    </p>
                    <Badge
                      className={
                        location.isActive
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                          : "border-red-300/20 bg-red-300/10 text-red-200"
                      }
                    >
                      {location.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(location)}
                      className="rounded-xl border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openStatusModal(location)}
                      className={
                        location.isActive
                          ? "rounded-xl border-orange-300/20 bg-orange-300/10 text-orange-100 hover:bg-orange-300/20"
                          : "rounded-xl border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20"
                      }
                    >
                      <Power className="mr-1 h-3.5 w-3.5" />
                      {location.isActive ? "Deactivate" : "Activate"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteModal(location)}
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
              {OFFICE_LOCATIONS_PER_PAGE} locations per page
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

      {/* Edit modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Edit Office Location
            </DialogTitle>
            <p className="text-sm text-white/50">
              Update office or plant site location details.
            </p>
          </DialogHeader>

          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Location Name</Label>
              <Input
                value={editForm.name}
                onChange={(event) =>
                  updateEditForm("name", event.target.value)
                }
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Textarea
                value={editForm.address}
                onChange={(event) =>
                  updateEditForm("address", event.target.value)
                }
                className="min-h-24 border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                inputMode="decimal"
                value={editForm.latitude}
                onChange={(event) =>
                  updateEditForm(
                    "latitude",
                    sanitizeCoordinateInput(event.target.value)
                  )
                }
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                inputMode="decimal"
                value={editForm.longitude}
                onChange={(event) =>
                  updateEditForm(
                    "longitude",
                    sanitizeCoordinateInput(event.target.value)
                  )
                }
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Reference Radius Meters</Label>
              <Input
                inputMode="numeric"
                value={editForm.radiusMeters}
                onChange={(event) =>
                  updateEditForm(
                    "radiusMeters",
                    sanitizeRadiusInput(event.target.value)
                  )
                }
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
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
              onClick={handleUpdateLocation}
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

      {/* Status modal */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="border-amber-100/15 bg-[#17100b] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {statusTarget?.isActive ? "Deactivate" : "Activate"} Location
            </DialogTitle>
            <p className="text-sm text-white/50">
              This will update location active status only.
            </p>
          </DialogHeader>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="font-bold text-white">
              {statusTarget?.name || "Selected location"}
            </p>
            <p className="mt-1 text-sm text-white/50">
              {statusTarget?.address || "No address"}
            </p>
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
              ) : statusTarget?.isActive ? (
                "Deactivate"
              ) : (
                "Activate"
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
              Delete Office Location
            </DialogTitle>
            <p className="text-sm text-white/50">
              This action will delete the selected office location if backend
              allows it.
            </p>
          </DialogHeader>

          <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4">
            <p className="font-bold text-white">
              {deleteTarget?.name || "Selected location"}
            </p>
            <p className="mt-1 text-sm text-white/50">
              {deleteTarget?.address || "No address"}
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
              onClick={handleDeleteLocation}
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