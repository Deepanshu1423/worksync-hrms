"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock3,
  FileText,
  RefreshCcw,
  Search,
  UserCheck,
  UserPlus,
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

import {
  getAttendanceReport,
  getEmployeeReport,
  getHireFireReport,
  getTaskReport,
} from "@/services/report.service";
import { ReportType } from "@/types/report.types";

type ApiErrorResponse = {
  message?: string;
};

type SummaryCardData = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
};

type ReportListItem = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  badgeText: string;
  badgeTone?: "default" | "success" | "warning" | "danger";
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  dateLabel: string;
  dateValue: string;
  searchText: string;
};

const REPORTS_PER_PAGE = 10;

/**
 * Extracts readable API error message safely without using any.
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
 * Converts minutes into readable hours/minutes.
 */
function formatMinutes(minutes?: number | null) {
  if (!minutes || minutes <= 0) return "0 min";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Badge color based on report item status.
 */
function getBadgeClass(tone: ReportListItem["badgeTone"]) {
  if (tone === "success") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (tone === "warning") {
    return "border-orange-300/20 bg-orange-300/10 text-orange-200";
  }

  if (tone === "danger") {
    return "border-red-300/20 bg-red-300/10 text-red-200";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-100";
}

/**
 * Decides badge tone from common status values.
 */
function getToneFromStatus(status: string): ReportListItem["badgeTone"] {
  if (["ACTIVE", "PRESENT", "COMPLETED", "HIRED"].includes(status)) {
    return "success";
  }

  if (["LATE", "IN_PROGRESS", "IN_REVIEW", "ON_NOTICE"].includes(status)) {
    return "warning";
  }

  if (["TERMINATED", "ABSENT", "CANCELLED"].includes(status)) {
    return "danger";
  }

  return "default";
}

/**
 * Summary card component.
 */
function ReportSummaryCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: SummaryCardData) {
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

/**
 * Loading skeleton for reports page.
 */
function ReportsLoading() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-40 rounded-[2rem] bg-white/10" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-3xl bg-white/10" />
        ))}
      </div>

      <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
    </section>
  );
}

/**
 * Returns report status filter options according to selected report type.
 */
function getStatusOptions(reportType: ReportType) {
  if (reportType === "attendance") {
    return [
      { label: "All Status", value: "ALL" },
      { label: "Present", value: "PRESENT" },
      { label: "Late", value: "LATE" },
      { label: "Absent", value: "ABSENT" },
      { label: "Half Day", value: "HALF_DAY" },
    ];
  }

  if (reportType === "tasks") {
    return [
      { label: "All Status", value: "ALL" },
      { label: "Pending", value: "PENDING" },
      { label: "In Progress", value: "IN_PROGRESS" },
      { label: "In Review", value: "IN_REVIEW" },
      { label: "Completed", value: "COMPLETED" },
      { label: "Cancelled", value: "CANCELLED" },
    ];
  }

  if (reportType === "employees") {
    return [
      { label: "All Status", value: "ALL" },
      { label: "Active", value: "ACTIVE" },
      { label: "Inactive", value: "INACTIVE" },
      { label: "On Notice", value: "ON_NOTICE" },
      { label: "Terminated", value: "TERMINATED" },
    ];
  }

  return [
    { label: "All", value: "ALL" },
    { label: "Hired", value: "HIRED" },
    { label: "Terminated", value: "TERMINATED" },
  ];
}

/**
 * Returns title according to selected report type.
 */
function getReportTitle(reportType: ReportType) {
  if (reportType === "attendance") return "Attendance Report";
  if (reportType === "tasks") return "Task Report";
  if (reportType === "employees") return "Employee Report";
  return "Hire / Fire Report";
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("attendance");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [summaryCards, setSummaryCards] = useState<SummaryCardData[]>([]);
  const [reportItems, setReportItems] = useState<ReportListItem[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches selected report from backend and converts it into common UI list format.
   */
  const fetchReport = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setIsLoading(true);
        }

        /**
         * Common query params for reports.
         * Employee report does not use date range in backend, so we do not pass dates there.
         */
        const commonDateParams = {
          fromDate,
          toDate,
        };

        if (reportType === "attendance") {
          const report = await getAttendanceReport({
            ...commonDateParams,
            status: statusFilter === "ALL" ? undefined : statusFilter,
          });

          setSummaryCards([
            {
              label: "Total Records",
              value: report.summary.totalRecords,
              icon: CalendarCheck,
            },
            {
              label: "Present",
              value: report.summary.present,
              icon: UserCheck,
              tone: "success",
            },
            {
              label: "Late",
              value: report.summary.late,
              icon: Clock3,
              tone: "warning",
            },
            {
              label: "Absent",
              value: report.summary.absent,
              icon: UserX,
              tone: "danger",
            },
          ]);

          setReportItems(
            report.records.map((record) => ({
              id: record.id,
              title: record.user.fullName,
              subtitle: `${record.user.employeeCode} • ${
                record.user.department?.name || "No department"
              }`,
              status: record.status,
              badgeText: record.status.replaceAll("_", " "),
              badgeTone: getToneFromStatus(record.status),
              primaryLabel: "Check In",
              primaryValue: formatDateTime(record.checkInAt),
              secondaryLabel: "Check Out",
              secondaryValue: formatDateTime(record.checkOutAt),
              dateLabel: "Work / Late",
              dateValue: `${formatMinutes(record.workingMinutes)} • Late ${formatMinutes(
                record.lateMinutes
              )}`,
              searchText: [
                record.user.fullName,
                record.user.employeeCode,
                record.user.email,
                record.user.mobile,
                record.user.department?.name,
                record.user.designation?.name,
                record.status,
                record.checkInAddress,
                record.checkOutAddress,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
            }))
          );
        }

        if (reportType === "tasks") {
          const report = await getTaskReport({
            ...commonDateParams,
            status: statusFilter === "ALL" ? undefined : statusFilter,
          });

          setSummaryCards([
            {
              label: "Total Tasks",
              value: report.summary.totalTasks,
              icon: ClipboardList,
            },
            {
              label: "In Progress",
              value: report.summary.inProgress,
              icon: Clock3,
              tone: "warning",
            },
            {
              label: "Completed",
              value: report.summary.completed,
              icon: UserCheck,
              tone: "success",
            },
            {
              label: "Overdue",
              value: report.summary.overdue,
              icon: UserX,
              tone: report.summary.overdue > 0 ? "danger" : "default",
            },
          ]);

          setReportItems(
            report.records.map((task) => ({
              id: task.id,
              title: task.title,
              subtitle: `Assigned to ${task.assignedTo.fullName} • ${
                task.project?.name || "No project"
              }`,
              status: task.status,
              badgeText: task.status.replaceAll("_", " "),
              badgeTone: getToneFromStatus(task.status),
              primaryLabel: "Priority",
              primaryValue: task.priority,
              secondaryLabel: "Created By",
              secondaryValue: task.createdBy.fullName,
              dateLabel: "Due Date",
              dateValue: formatDate(task.dueDate),
              searchText: [
                task.title,
                task.description,
                task.status,
                task.priority,
                task.project?.name,
                task.assignedTo.fullName,
                task.assignedTo.employeeCode,
                task.createdBy.fullName,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
            }))
          );
        }

        if (reportType === "employees") {
          const report = await getEmployeeReport({
            status: statusFilter === "ALL" ? undefined : statusFilter,
          });

          setSummaryCards([
            {
              label: "Total Employees",
              value: report.summary.totalEmployees,
              icon: UsersRound,
            },
            {
              label: "Active",
              value: report.summary.active,
              icon: UserCheck,
              tone: "success",
            },
            {
              label: "On Notice",
              value: report.summary.onNotice,
              icon: Clock3,
              tone: "warning",
            },
            {
              label: "Terminated",
              value: report.summary.terminated,
              icon: UserX,
              tone: "danger",
            },
          ]);

          setReportItems(
            report.records.map((employee) => ({
              id: employee.id,
              title: employee.fullName,
              subtitle: `${employee.employeeCode} • ${employee.email}`,
              status: employee.status,
              badgeText: employee.status.replaceAll("_", " "),
              badgeTone: getToneFromStatus(employee.status),
              primaryLabel: "Role",
              primaryValue: employee.role.name,
              secondaryLabel: "Department",
              secondaryValue: employee.department?.name || "No department",
              dateLabel: "Joining Date",
              dateValue: formatDate(employee.dateOfJoining),
              searchText: [
                employee.fullName,
                employee.employeeCode,
                employee.email,
                employee.mobile,
                employee.status,
                employee.role.name,
                employee.department?.name,
                employee.designation?.name,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
            }))
          );
        }

        if (reportType === "hire_fire") {
          const report = await getHireFireReport({
            ...commonDateParams,
            type:
              statusFilter === "HIRED" || statusFilter === "TERMINATED"
                ? statusFilter
                : "ALL",
          });

          setSummaryCards([
            {
              label: "Total Hired",
              value: report.summary.totalHired,
              icon: UserPlus,
              tone: "success",
            },
            {
              label: "Total Terminated",
              value: report.summary.totalTerminated,
              icon: UserX,
              tone: "danger",
            },
            {
              label: "Net Change",
              value: report.summary.totalHired - report.summary.totalTerminated,
              icon: BarChart3,
            },
            {
              label: "Report Type",
              value: "HR Lifecycle",
              icon: FileText,
            },
          ]);

          const hiredItems: ReportListItem[] = report.records.hired.map(
            (employee) => ({
              id: `${employee.id}-hired`,
              title: employee.fullName,
              subtitle: `${employee.employeeCode} • ${employee.email}`,
              status: "HIRED",
              badgeText: "HIRED",
              badgeTone: "success",
              primaryLabel: "Role",
              primaryValue: employee.role.name,
              secondaryLabel: "Department",
              secondaryValue: employee.department?.name || "No department",
              dateLabel: "Joining Date",
              dateValue: formatDate(employee.dateOfJoining),
              searchText: [
                employee.fullName,
                employee.employeeCode,
                employee.email,
                employee.mobile,
                employee.role.name,
                employee.department?.name,
                employee.designation?.name,
                "hired",
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
            })
          );

          const terminatedItems: ReportListItem[] =
            report.records.terminated.map((employee) => ({
              id: `${employee.id}-terminated`,
              title: employee.fullName,
              subtitle: `${employee.employeeCode} • ${employee.email}`,
              status: "TERMINATED",
              badgeText: "TERMINATED",
              badgeTone: "danger",
              primaryLabel: "Role",
              primaryValue: employee.role.name,
              secondaryLabel: "Reason",
              secondaryValue: employee.terminationReason || "No reason added",
              dateLabel: "Terminated At",
              dateValue: formatDate(employee.terminatedAt),
              searchText: [
                employee.fullName,
                employee.employeeCode,
                employee.email,
                employee.mobile,
                employee.role.name,
                employee.department?.name,
                employee.designation?.name,
                employee.terminationReason,
                "terminated",
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
            }));

          setReportItems([...hiredItems, ...terminatedItems]);
        }

        setCurrentPage(1);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "Failed to fetch report"));
      } finally {
        setIsLoading(false);
      }
    },
    [fromDate, reportType, statusFilter, toDate]
  );

  /**
   * Initial report load and reload when report type / filters change.
   */
  useEffect(() => {
    const loadReport = async () => {
      await fetchReport(false);
    };

    loadReport();
  }, [fetchReport]);

  /**
   * Search filter on already fetched report list.
   */
  const filteredReportItems = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    if (!keyword) return reportItems;

    return reportItems.filter((item) => item.searchText.includes(keyword));
  }, [reportItems, searchTerm]);

  /**
   * Pagination calculation.
   * Only 10 report records will show per page.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredReportItems.length / REPORTS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * REPORTS_PER_PAGE;
  const endIndex = startIndex + REPORTS_PER_PAGE;

  const paginatedItems = filteredReportItems.slice(startIndex, endIndex);

  /**
   * Handles report type change and resets filters.
   */
  const handleReportTypeChange = (value: ReportType) => {
    setReportType(value);
    setSearchTerm("");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  /**
   * Clears visible filters.
   */
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  if (isLoading) {
    return <ReportsLoading />;
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
              <FileText className="h-4 w-4" />
              Reports Center
            </p>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              HRMS Reports & Analytics
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
              View attendance, task, employee and hire/fire reports with filters,
              search and responsive paginated records.
            </p>
          </div>

          <Button
            onClick={() => fetchReport(true)}
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
        {summaryCards.map((card) => (
          <ReportSummaryCard key={card.label} {...card} />
        ))}
      </div>

      {/* Report list */}
      <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
        <CardContent className="p-0">
          {/* Filters */}
          <div className="space-y-4 border-b border-white/10 p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    {getReportTitle(reportType)}
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    Showing{" "}
                    {filteredReportItems.length === 0 ? 0 : startIndex + 1}-
                    {Math.min(endIndex, filteredReportItems.length)} of{" "}
                    {filteredReportItems.length} records
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-[1.1fr_1.1fr_1fr_1fr_1.4fr_auto]">
                <Select
                  value={reportType}
                  onValueChange={(value) =>
                    handleReportTypeChange(value as ReportType)
                  }
                >
                  <SelectTrigger className="h-11 border-white/10 bg-white/[0.04] text-white">
                    <SelectValue placeholder="Select report" />
                  </SelectTrigger>

                  <SelectContent className="border-white/10 bg-[#17100b] text-white">
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="employees">Employees</SelectItem>
                    <SelectItem value="hire_fire">Hire / Fire</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-11 border-white/10 bg-white/[0.04] text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>

                  <SelectContent className="border-white/10 bg-[#17100b] text-white">
                    {getStatusOptions(reportType).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={fromDate}
                  disabled={reportType === "employees"}
                  onChange={(event) => {
                    setFromDate(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 border-white/10 bg-white/[0.04] text-white disabled:opacity-40"
                />

                <Input
                  type="date"
                  value={toDate}
                  disabled={reportType === "employees"}
                  onChange={(event) => {
                    setToDate(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 border-white/10 bg-white/[0.04] text-white disabled:opacity-40"
                />

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search report..."
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
          <div className="hidden border-b border-white/10 px-5 py-4 xl:grid xl:grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr] xl:gap-4">
            <p className="text-sm font-bold text-white/50">Record</p>
            <p className="text-sm font-bold text-white/50">Status</p>
            <p className="text-sm font-bold text-white/50">Primary</p>
            <p className="text-sm font-bold text-white/50">Secondary</p>
            <p className="text-sm font-bold text-white/50">Date / Time</p>
          </div>

          {/* Responsive report records */}
          <div className="divide-y divide-white/10">
            {filteredReportItems.length === 0 ? (
              <div className="p-10 text-center text-white/50">
                No report records found.
              </div>
            ) : (
              paginatedItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-5 p-5 hover:bg-white/[0.025] xl:grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr] xl:items-center xl:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/40 xl:hidden">Record</p>
                    <p className="break-words font-bold text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 break-words text-xs text-white/45">
                      {item.subtitle}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-white/40 xl:hidden">
                      Status
                    </p>
                    <Badge className={getBadgeClass(item.badgeTone)}>
                      {item.badgeText}
                    </Badge>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40">{item.primaryLabel}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-white/75">
                      {item.primaryValue}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40">
                      {item.secondaryLabel}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-white/75">
                      {item.secondaryValue}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40">{item.dateLabel}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-white/75">
                      {item.dateValue}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-4 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/50">
              Page {safeCurrentPage} of {totalPages} • {REPORTS_PER_PAGE}{" "}
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
    </section>
  );
}