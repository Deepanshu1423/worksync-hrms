"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  UserX,
  UsersRound,
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

import { getAdminAttendanceRecords } from "@/services/attendance.service";
import { AttendanceRecord } from "@/types/attendance.types";

type ApiErrorResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
};

type AttendanceFilterStatus = "ALL" | "PRESENT" | "LATE" | "ABSENT" | "HALF_DAY";

const ATTENDANCE_PER_PAGE = 10;

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
    return "You do not have permission to view attendance records.";
  }

  if (statusCode === 404) {
    return "Attendance API route not found. Please check backend attendance routes.";
  }

  if (statusCode >= 500) {
    return "Server error while fetching attendance records. Please try again later.";
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
 * Formats date into readable format.
 */
function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

/**
 * Formats date-time into readable format.
 */
function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Converts working minutes into readable hours/minutes.
 */
function formatMinutes(minutes?: number | null) {
  if (!minutes || minutes <= 0) return "0 min";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Returns badge style according to attendance status.
 */
function getAttendanceStatusBadgeClass(status: string) {
  if (status === "PRESENT") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (status === "LATE") {
    return "border-orange-300/20 bg-orange-300/10 text-orange-200";
  }

  if (status === "ABSENT") {
    return "border-red-300/20 bg-red-300/10 text-red-200";
  }

  if (status === "HALF_DAY") {
    return "border-yellow-300/20 bg-yellow-300/10 text-yellow-100";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

/**
 * Builds Google Maps URL from latitude and longitude.
 */
function getMapUrl(
  latitude?: number | string | null,
  longitude?: number | string | null
) {
  if (latitude === null || latitude === undefined) return "";
  if (longitude === null || longitude === undefined) return "";

  return `https://www.google.com/maps?q=${Number(latitude)},${Number(longitude)}`;
}

/**
 * Checks whether attendance date is today.
 */
function isToday(value?: string | null) {
  if (!value) return false;

  const inputDate = new Date(value);
  const today = new Date();

  return (
    inputDate.getFullYear() === today.getFullYear() &&
    inputDate.getMonth() === today.getMonth() &&
    inputDate.getDate() === today.getDate()
  );
}

/**
 * Returns YYYY-MM-DD string from date.
 */
function getDateInputValue(value?: string | null) {
  if (!value) return "";

  return new Date(value).toISOString().split("T")[0];
}

/**
 * Creates a stable key for duplicate checking.
 *
 * Primary unique key should be record.id.
 * Fallback key prevents duplicate UI if backend accidentally sends records
 * without id.
 */
function getAttendanceUniqueKey(record: AttendanceRecord) {
  return (
    record.id ||
    [
      record.user?.id,
      record.user?.employeeCode,
      record.date,
      record.checkInAt,
      record.checkOutAt,
    ]
      .filter(Boolean)
      .join("-")
  );
}

/**
 * Summary card used at top of attendance page.
 */
function AttendanceSummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
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
 * Loading skeleton shown while attendance records are fetching.
 */
function AttendanceLoading() {
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
 * Better empty state for attendance page.
 */
function EmptyAttendanceState({ clearFilters }: { clearFilters: () => void }) {
  return (
    <div className="p-10">
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          <CalendarCheck className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-black text-white">
          No attendance records found
        </h3>
        <p className="mt-2 text-sm leading-6 text-white/50">
          No attendance matched your current search, status or date filter.
          Clear filters and try again.
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

export default function AdminAttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<AttendanceFilterStatus>("ALL");
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch attendance records from backend.
   */
  const fetchAttendanceRecords = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const records = await getAdminAttendanceRecords();

      setAttendanceRecords(records);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "Failed to fetch attendance records.")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initial API call.
   */
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchAttendanceRecords(false);
    };

    void loadInitialData();
  }, [fetchAttendanceRecords]);

  /**
   * Duplicate-safe records.
   *
   * Important:
   * Always use this array for summary, filters and display.
   * This prevents duplicate records from showing on UI even if API sends
   * duplicate rows accidentally.
   */
  const uniqueAttendanceRecords = useMemo(() => {
    const recordMap = new Map<string, AttendanceRecord>();

    attendanceRecords.forEach((record) => {
      const uniqueKey = getAttendanceUniqueKey(record);

      if (!uniqueKey) return;

      if (!recordMap.has(uniqueKey)) {
        recordMap.set(uniqueKey, record);
      }
    });

    return Array.from(recordMap.values());
  }, [attendanceRecords]);

  /**
   * Top summary calculation.
   */
  const attendanceSummary = useMemo(() => {
    const todayRecords = uniqueAttendanceRecords.filter((record) =>
      isToday(record.date)
    );

    return {
      totalRecords: uniqueAttendanceRecords.length,
      todayRecords: todayRecords.length,
      todayPresent: todayRecords.filter(
        (record) => record.status === "PRESENT" || record.status === "LATE"
      ).length,
      todayLate: todayRecords.filter((record) => record.status === "LATE")
        .length,
      todayAbsent: todayRecords.filter((record) => record.status === "ABSENT")
        .length,
    };
  }, [uniqueAttendanceRecords]);

  /**
   * Search + status + date filter.
   */
  const filteredAttendanceRecords = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    return uniqueAttendanceRecords.filter((record) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : record.status === statusFilter;

      const matchesDate = dateFilter
        ? getDateInputValue(record.date) === dateFilter
        : true;

      const searchableText = [
        record.user?.employeeCode,
        record.user?.fullName,
        record.user?.email,
        record.user?.mobile,
        record.user?.department?.name,
        record.user?.designation?.name,
        record.status,
        record.checkInAddress,
        record.checkOutAddress,
        formatDate(record.date),
        formatDateTime(record.checkInAt),
        formatDateTime(record.checkOutAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [uniqueAttendanceRecords, searchTerm, statusFilter, dateFilter]);

  /**
   * Pagination calculation.
   * Only 10 attendance records will show per page.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAttendanceRecords.length / ATTENDANCE_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * ATTENDANCE_PER_PAGE;
  const endIndex = startIndex + ATTENDANCE_PER_PAGE;

  const paginatedAttendanceRecords = filteredAttendanceRecords.slice(
    startIndex,
    endIndex
  );

  /**
   * Clears all filters and resets pagination.
   */
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setDateFilter("");
    setCurrentPage(1);
  };

  if (isLoading) {
    return <AttendanceLoading />;
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
              Attendance Management
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Employee Attendance Monitor
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              View employee check-in, check-out, geo location, photo proof,
              working minutes and attendance status from one premium admin
              dashboard.
            </p>
          </div>

          <Button
            onClick={() => fetchAttendanceRecords(true)}
            variant="outline"
            className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AttendanceSummaryCard
          label="Total Records"
          value={attendanceSummary.totalRecords}
          description="Unique attendance records available."
          icon={UsersRound}
        />

        <AttendanceSummaryCard
          label="Today Present"
          value={attendanceSummary.todayPresent}
          description="Present and late employees today."
          icon={UserCheck}
          tone="success"
        />

        <AttendanceSummaryCard
          label="Today Late"
          value={attendanceSummary.todayLate}
          description="Employees marked late today."
          icon={Clock3}
          tone="warning"
        />

        <AttendanceSummaryCard
          label="Today Absent"
          value={attendanceSummary.todayAbsent}
          description="Employees marked absent today."
          icon={UserX}
          tone="danger"
        />
      </div>

      {/* Attendance list */}
      <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
        <CardContent className="p-0">
          {/* Filters */}
          <div className="space-y-4 border-b border-white/10 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                  <Filter className="h-3.5 w-3.5" />
                  Attendance Directory
                </div>

                <h2 className="text-xl font-black text-white">
                  Attendance List
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Showing{" "}
                  {filteredAttendanceRecords.length === 0 ? 0 : startIndex + 1}
                  -{Math.min(endIndex, filteredAttendanceRecords.length)} of{" "}
                  {filteredAttendanceRecords.length} records
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
                    placeholder="Search employee, code, department..."
                    className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/35"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as AttendanceFilterStatus);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-11 border-white/10 bg-white/[0.04] text-white">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>

                  <SelectContent className="border-white/10 bg-[#17100b] text-white">
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="LATE">Late</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => {
                    setDateFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 border-white/10 bg-white/[0.04] text-white"
                />

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
          <div className="hidden border-b border-white/10 px-5 py-4 xl:grid xl:grid-cols-[1.25fr_1.1fr_1.1fr_0.85fr_0.85fr_1.4fr] xl:gap-4">
            <p className="text-sm font-bold text-white/50">Employee</p>
            <p className="text-sm font-bold text-white/50">Check In</p>
            <p className="text-sm font-bold text-white/50">Check Out</p>
            <p className="text-sm font-bold text-white/50">Work Time</p>
            <p className="text-sm font-bold text-white/50">Status</p>
            <p className="text-right text-sm font-bold text-white/50">
              Proof / Location
            </p>
          </div>

          {/* Responsive records */}
          <div className="divide-y divide-white/10">
            {filteredAttendanceRecords.length === 0 ? (
              <EmptyAttendanceState clearFilters={clearFilters} />
            ) : (
              paginatedAttendanceRecords.map((record) => {
                const checkInMapUrl = getMapUrl(
                  record.checkInLatitude,
                  record.checkInLongitude
                );

                const checkOutMapUrl = getMapUrl(
                  record.checkOutLatitude,
                  record.checkOutLongitude
                );

                const primaryMapUrl = checkInMapUrl || checkOutMapUrl;

                return (
                  <div
                    key={getAttendanceUniqueKey(record)}
                    className="grid gap-5 p-5 hover:bg-white/[0.025] xl:grid-cols-[1.25fr_1.1fr_1.1fr_0.85fr_0.85fr_1.4fr] xl:items-center xl:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/40 xl:hidden">
                        Employee
                      </p>

                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-xs font-black text-black">
                          {(record.user?.fullName || "EM")
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="break-words font-black text-white">
                            {record.user?.fullName || "Unknown Employee"}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            {record.user?.employeeCode || "No Code"}
                          </p>
                          <p className="mt-1 break-words text-xs text-white/45">
                            {record.user?.department?.name || "No department"}{" "}
                            •{" "}
                            {record.user?.designation?.name ||
                              "No designation"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-white/40 xl:hidden">
                        Check In
                      </p>
                      <p className="flex items-center gap-2 text-sm text-white/70">
                        <Clock3 className="h-4 w-4 shrink-0 text-amber-300" />
                        {formatDateTime(record.checkInAt)}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        Date: {formatDate(record.date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-white/40 xl:hidden">
                        Check Out
                      </p>
                      <p className="flex items-center gap-2 text-sm text-white/70">
                        <Timer className="h-4 w-4 shrink-0 text-amber-300" />
                        {formatDateTime(record.checkOutAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-white/40 xl:hidden">
                        Work Time
                      </p>
                      <p className="font-semibold text-white">
                        {formatMinutes(record.workingMinutes)}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        Late: {formatMinutes(record.lateMinutes)}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-sm text-white/40 xl:hidden">
                        Status
                      </p>
                      <Badge
                        className={getAttendanceStatusBadgeClass(record.status)}
                      >
                        {record.status.replaceAll("_", " ")}
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
                      {record.checkInPhoto?.fileUrl ? (
                        <a
                          href={record.checkInPhoto.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/20"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          In Photo
                        </a>
                      ) : null}

                      {record.checkOutPhoto?.fileUrl ? (
                        <a
                          href={record.checkOutPhoto.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/20"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Out Photo
                        </a>
                      ) : null}

                      {primaryMapUrl ? (
                        <a
                          href={primaryMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/20"
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          Map
                          <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-4 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/50">
              Page {safeCurrentPage} of {totalPages} • {ATTENDANCE_PER_PAGE}{" "}
              records per page
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
                Attendance Verification
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                This page shows unique attendance records only. Duplicate rows
                from API response are filtered before summary, search and list
                rendering.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}