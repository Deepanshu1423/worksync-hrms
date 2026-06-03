"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  ExternalLink,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  RefreshCcw,
  Search,
  Timer,
  UserCheck,
  UserX,
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

import { clearAuthSession } from "@/services/auth.service";
import { getMyAttendanceHistory } from "@/services/employee-attendance.service";
import { AttendanceRecord } from "@/types/attendance.types";
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

type AttendanceFilterStatus = "ALL" | "PRESENT" | "LATE" | "ABSENT" | "HALF_DAY";

const ATTENDANCE_HISTORY_PER_PAGE = 10;

/**
 * Reads logged-in user from localStorage.
 *
 * Important:
 * This function must run only in browser-side code.
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
 * This prevents raw backend/Zod/Prisma errors from showing in toast.
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
    return "You do not have permission to view attendance history.";
  }

  if (statusCode === 404) {
    return "Attendance history API route not found. Please check backend route /attendance/my-history.";
  }

  if (statusCode >= 500) {
    return "Server error while fetching attendance history. Please try again after some time.";
  }

  if (Array.isArray(data?.errors)) {
    const firstError = data.errors[0];
    return firstError?.message || fallback;
  }

  if (data?.errors && typeof data.errors === "object") {
    const firstKey = Object.keys(data.errors)[0];
    const firstValue = data.errors[firstKey];

    if (Array.isArray(firstValue)) {
      return firstValue[0] || fallback;
    }
  }

  if (Array.isArray(data?.message)) {
    return data.message[0] || fallback;
  }

  if (typeof data?.message === "string") {
    const lowerMessage = data.message.toLowerCase();

    if (
      lowerMessage.includes("invalid `prisma.") ||
      lowerMessage.includes("unknown field") ||
      lowerMessage.includes("available options are marked")
    ) {
      return "Backend database field mismatch. Please check attendance service and Prisma model.";
    }

    return data.message;
  }

  if (typeof data?.error === "string") {
    return data.error;
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
 * Formats date-time into readable UI format.
 */
function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Converts minutes into readable hours/minutes format.
 */
function formatMinutes(minutes?: number | null) {
  if (!minutes || minutes <= 0) return "0 min";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Returns YYYY-MM-DD from record date for date input comparison.
 */
function getDateInputValue(value?: string | null) {
  if (!value) return "";

  return new Date(value).toISOString().split("T")[0];
}

/**
 * Builds Google Maps link from latitude and longitude.
 */
function getMapUrl(latitude?: number | null, longitude?: number | null) {
  if (latitude === null || latitude === undefined) return "";
  if (longitude === null || longitude === undefined) return "";

  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Attendance status badge style.
 */
function getAttendanceStatusBadgeClass(status?: string | null) {
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
 * Loading skeleton.
 * This UI is rendered on first server/client render to avoid hydration mismatch.
 */
function AttendanceHistoryLoading() {
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
function AttendanceSummaryCard({
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

export default function EmployeeAttendanceHistoryPage() {
  const router = useRouter();

  /**
   * Do not read localStorage directly in initial state.
   * This prevents hydration mismatch.
   */
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPageReady, setIsPageReady] = useState(false);

  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceRecord[]
  >([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<AttendanceFilterStatus>("ALL");
  const [dateFilter, setDateFilter] = useState("");

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
        toast.error("Attendance history page is only for employee users.");

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
   * Load attendance history after employee session is ready.
   */
  useEffect(() => {
    if (!isPageReady || !user || user.role !== "EMPLOYEE") return;

    let isMounted = true;

    const loadAttendanceHistory = async () => {
      try {
        const records = await getMyAttendanceHistory();

        if (isMounted) {
          setAttendanceHistory(records);
        }
      } catch (error: unknown) {
        if (isMounted) {
          toast.error(
            getApiErrorMessage(
              error,
              "Failed to fetch attendance history. Please try again."
            )
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAttendanceHistory();

    return () => {
      isMounted = false;
    };
  }, [isPageReady, user]);

  /**
   * Refresh attendance history manually.
   */
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);

      const records = await getMyAttendanceHistory();

      setAttendanceHistory(records);
      toast.success("Attendance history refreshed successfully.");
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(
          error,
          "Failed to refresh attendance history. Please try again."
        )
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Summary calculation.
   */
  const attendanceSummary = useMemo(() => {
    const presentCount = attendanceHistory.filter(
      (record) => record.status === "PRESENT"
    ).length;

    const lateCount = attendanceHistory.filter(
      (record) => record.status === "LATE"
    ).length;

    const absentCount = attendanceHistory.filter(
      (record) => record.status === "ABSENT"
    ).length;

    return {
      total: attendanceHistory.length,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
    };
  }, [attendanceHistory]);

  /**
   * Search + status + date filtering.
   */
  const filteredAttendanceHistory = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    return attendanceHistory.filter((record) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : record.status === statusFilter;

      const matchesDate = dateFilter
        ? getDateInputValue(record.date) === dateFilter
        : true;

      const searchableText = [
        record.status,
        formatDate(record.date),
        formatDateTime(record.checkInAt),
        formatDateTime(record.checkOutAt),
        record.checkInAddress,
        record.checkOutAddress,
        String(record.workingMinutes ?? 0),
        String(record.lateMinutes ?? 0),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword
        ? searchableText.includes(keyword)
        : true;

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [attendanceHistory, searchTerm, statusFilter, dateFilter]);

  /**
   * Pagination calculation.
   * Only 10 records will show per page.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAttendanceHistory.length / ATTENDANCE_HISTORY_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * ATTENDANCE_HISTORY_PER_PAGE;
  const endIndex = startIndex + ATTENDANCE_HISTORY_PER_PAGE;

  const paginatedAttendanceHistory = filteredAttendanceHistory.slice(
    startIndex,
    endIndex
  );

  /**
   * Clears filters and resets pagination.
   */
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setDateFilter("");
    setCurrentPage(1);
  };

  /**
   * Logout employee.
   */
  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  /**
   * First render will always show loading UI.
   * This fixes hydration mismatch.
   */
  if (!isPageReady || !user || user.role !== "EMPLOYEE" || isLoading) {
    return <AttendanceHistoryLoading />;
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
                <History className="h-4 w-4" />
                My Attendance History
              </p>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Attendance Records
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
                View your check-in/check-out history, working time, late time,
                location maps and uploaded photo proof.
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
                Mark Attendance
              </Button>

              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
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
          <AttendanceSummaryCard
            label="Total Records"
            value={attendanceSummary.total}
            icon={CalendarCheck}
          />

          <AttendanceSummaryCard
            label="Present Days"
            value={attendanceSummary.present}
            icon={UserCheck}
            tone="success"
          />

          <AttendanceSummaryCard
            label="Late Days"
            value={attendanceSummary.late}
            icon={Clock3}
            tone="warning"
          />

          <AttendanceSummaryCard
            label="Absent Days"
            value={attendanceSummary.absent}
            icon={UserX}
            tone="danger"
          />
        </div>

        {/* Attendance history list */}
        <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
          <CardContent className="p-0">
            {/* Filters */}
            <div className="space-y-4 border-b border-white/10 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    History List
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    Showing{" "}
                    {filteredAttendanceHistory.length === 0
                      ? 0
                      : startIndex + 1}
                    -{Math.min(endIndex, filteredAttendanceHistory.length)} of{" "}
                    {filteredAttendanceHistory.length} records
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
                      placeholder="Search history..."
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
            <div className="hidden border-b border-white/10 px-5 py-4 xl:grid xl:grid-cols-[1fr_1.1fr_1.1fr_0.9fr_0.9fr_1.5fr] xl:gap-4">
              <p className="text-sm font-bold text-white/50">Date</p>
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
              {filteredAttendanceHistory.length === 0 ? (
                <div className="p-10 text-center text-white/50">
                  No attendance history found.
                </div>
              ) : (
                paginatedAttendanceHistory.map((record) => {
                  const checkInMapUrl = getMapUrl(
                    record.checkInLatitude,
                    record.checkInLongitude
                  );

                  const checkOutMapUrl = getMapUrl(
                    record.checkOutLatitude,
                    record.checkOutLongitude
                  );

                  return (
                    <div
                      key={record.id}
                      className="grid gap-5 p-5 hover:bg-white/[0.025] xl:grid-cols-[1fr_1.1fr_1.1fr_0.9fr_0.9fr_1.5fr] xl:items-center xl:gap-4"
                    >
                      {/* Date */}
                      <div>
                        <p className="text-sm text-white/40 xl:hidden">
                          Date
                        </p>
                        <p className="font-bold text-white">
                          {formatDate(record.date)}
                        </p>
                      </div>

                      {/* Check In */}
                      <div>
                        <p className="text-sm text-white/40 xl:hidden">
                          Check In
                        </p>
                        <p className="flex items-center gap-2 text-sm text-white/70">
                          <Clock3 className="h-4 w-4 shrink-0 text-amber-300" />
                          {formatDateTime(record.checkInAt)}
                        </p>
                      </div>

                      {/* Check Out */}
                      <div>
                        <p className="text-sm text-white/40 xl:hidden">
                          Check Out
                        </p>
                        <p className="flex items-center gap-2 text-sm text-white/70">
                          <Timer className="h-4 w-4 shrink-0 text-amber-300" />
                          {formatDateTime(record.checkOutAt)}
                        </p>
                      </div>

                      {/* Work Time */}
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

                      {/* Status */}
                      <div>
                        <p className="mb-1 text-sm text-white/40 xl:hidden">
                          Status
                        </p>
                        <Badge
                          className={getAttendanceStatusBadgeClass(
                            record.status
                          )}
                        >
                          {record.status.replaceAll("_", " ")}
                        </Badge>
                      </div>

                      {/* Proof and location */}
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

                        {checkInMapUrl ? (
                          <a
                            href={checkInMapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/20"
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            In Map
                            <ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </a>
                        ) : null}

                        {checkOutMapUrl ? (
                          <a
                            href={checkOutMapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/20"
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            Out Map
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
                Page {safeCurrentPage} of {totalPages} •{" "}
                {ATTENDANCE_HISTORY_PER_PAGE} records per page
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
      </section>
    </main>
  );
}