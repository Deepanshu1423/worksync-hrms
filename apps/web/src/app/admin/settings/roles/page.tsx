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
  Filter,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { getRoles } from "@/services/master-data.service";
import { RoleOption } from "@/types/master-data.types";

type ApiErrorResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
};

const ROLES_PER_PAGE = 10;

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<ApiErrorResponse>(error)) return fallback;

  if (!error.response) {
    return "Backend server is not reachable. Please check if API server is running.";
  }

  const statusCode = error.response.status;
  const data = error.response.data;

  if (statusCode === 401) return "Your session has expired. Please login again.";
  if (statusCode === 403) return "You do not have permission to view roles.";
  if (statusCode === 404) return "Roles API route not found. Please check backend routes.";
  if (statusCode >= 500) return "Server error while fetching roles.";

  if (Array.isArray(data?.message)) return data.message[0] || fallback;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  return fallback;
}

/**
 * Converts role code into readable label.
 * Example: SUPER_ADMIN -> Super Admin
 */
function formatRoleName(roleName: string) {
  return roleName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Gives default role descriptions if backend does not send description.
 */
function getRoleDescription(roleName: string, backendDescription?: string | null) {
  if (backendDescription) return backendDescription;

  const descriptions: Record<string, string> = {
    SUPER_ADMIN:
      "Has complete control over the HRMS system, including all settings, users, reports and configurations.",
    ADMIN:
      "Can manage employees, attendance, tasks, projects, reports and master data according to company permissions.",
    HR:
      "Can manage employee records, attendance review, HR reports and employee-related workflows.",
    MANAGER:
      "Can view team members, assign tasks, monitor team attendance and track project work.",
    EMPLOYEE:
      "Can check in/out, view assigned tasks, update task progress and manage personal attendance activity.",
    TEAM_MEMBER:
      "Can check in/out, view assigned tasks, update task progress and manage personal attendance activity.",
  };

  return descriptions[roleName] || "System role used for access control.";
}

function getRoleUniqueKey(role: RoleOption) {
  return role.id || role.name;
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

function RolesLoading() {
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
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-black text-white">No roles found</h3>
        <p className="mt-2 text-sm leading-6 text-white/50">
          No role matched your current search. Clear filters and try again.
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

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      const data = await getRoles();
      setRoles(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch roles."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchRoles(false);
    };

    void loadInitialData();
  }, [fetchRoles]);

  /**
   * Duplicate-safe roles.
   * API data -> unique records -> summary -> search -> pagination -> display.
   */
  const uniqueRoles = useMemo(() => {
    const roleMap = new Map<string, RoleOption>();

    roles.forEach((role) => {
      const uniqueKey = getRoleUniqueKey(role);
      if (!uniqueKey) return;

      if (!roleMap.has(uniqueKey)) {
        roleMap.set(uniqueKey, role);
      }
    });

    return Array.from(roleMap.values());
  }, [roles]);

  const filteredRoles = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    return uniqueRoles.filter((role) => {
      const searchableText = [
        role.name,
        formatRoleName(role.name),
        role.description,
        getRoleDescription(role.name, role.description),
        String(role.totalUsers ?? 0),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return keyword ? searchableText.includes(keyword) : true;
    });
  }, [uniqueRoles, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRoles.length / ROLES_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ROLES_PER_PAGE;
  const endIndex = startIndex + ROLES_PER_PAGE;
  const paginatedRoles = filteredRoles.slice(startIndex, endIndex);

  const clearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  if (isLoading) return <RolesLoading />;

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
              Roles
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              System Roles
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              View fixed access-control roles used across WorkSync HRMS. Roles
              control admin, manager and employee module access.
            </p>
          </div>

          <Button
            onClick={() => fetchRoles(true)}
            variant="outline"
            className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Roles"
          value={uniqueRoles.length}
          description="Unique system roles."
          icon={ShieldCheck}
        />

        <SummaryCard
          label="Total Users"
          value={uniqueRoles.reduce(
            (sum, role) => sum + (role.totalUsers ?? 0),
            0
          )}
          description="Users assigned across all roles."
          icon={UsersRound}
        />
      </div>

      {/* Roles list */}
      <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
        <CardContent className="p-0">
          {/* Filters */}
          <div className="space-y-4 border-b border-white/10 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                  <Filter className="h-3.5 w-3.5" />
                  Role Directory
                </div>

                <h2 className="text-xl font-black text-white">Role List</h2>
                <p className="mt-1 text-sm text-white/50">
                  Showing {filteredRoles.length === 0 ? 0 : startIndex + 1}-
                  {Math.min(endIndex, filteredRoles.length)} of{" "}
                  {filteredRoles.length} roles
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
                    placeholder="Search role..."
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
          <div className="hidden border-b border-white/10 px-5 py-4 lg:grid lg:grid-cols-[1.1fr_2fr_0.8fr] lg:gap-4">
            <p className="text-sm font-bold text-white/50">Role</p>
            <p className="text-sm font-bold text-white/50">Description</p>
            <p className="text-right text-sm font-bold text-white/50">Users</p>
          </div>

          {/* Responsive list */}
          <div className="divide-y divide-white/10">
            {filteredRoles.length === 0 ? (
              <EmptyState clearFilters={clearFilters} />
            ) : (
              paginatedRoles.map((role) => (
                <div
                  key={getRoleUniqueKey(role)}
                  className="grid gap-5 p-5 hover:bg-white/[0.025] lg:grid-cols-[1.1fr_2fr_0.8fr] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/40 lg:hidden">Role</p>
                    <p className="break-words font-black text-white">
                      {formatRoleName(role.name)}
                    </p>

                    <Badge className="mt-2 border-amber-300/20 bg-amber-300/10 text-amber-100">
                      {role.name}
                    </Badge>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40 lg:hidden">
                      Description
                    </p>
                    <p className="break-words text-sm leading-6 text-white/65">
                      {getRoleDescription(role.name, role.description)}
                    </p>
                  </div>

                  <div className="lg:text-right">
                    <p className="text-sm text-white/40 lg:hidden">Users</p>
                    <p className="text-lg font-black text-white">
                      {role.totalUsers ?? 0}
                    </p>
                    <p className="text-xs text-white/45">assigned users</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-4 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/50">
              Page {safeCurrentPage} of {totalPages} • {ROLES_PER_PAGE} roles
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

      {/* Note */}
      <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">
                Duplicate-safe Role Display
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                This page shows unique roles only. Duplicate rows from API
                response are filtered before summary, search and list rendering.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}