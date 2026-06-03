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
  RefreshCcw,
  Search,
  ShieldCheck,
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
  message?: string;
};

const ROLES_PER_PAGE = 10;

/**
 * Extracts readable backend error message safely.
 */
function getApiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message || fallback;
  }

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
    TEAM_MEMBER:
      "Can check in/out, view assigned tasks, update task progress and manage personal attendance activity.",
  };

  return descriptions[roleName] || "System role used for access control.";
}

/**
 * Summary card for roles page.
 */
function RoleSummaryCard({
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
 * Loading skeleton while roles are being fetched.
 */
function RolesLoading() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-40 rounded-[2rem] bg-white/10" />
      <Skeleton className="h-32 rounded-3xl bg-white/10" />
      <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
    </section>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch system roles from backend.
   */
  const fetchRoles = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const data = await getRoles();

      setRoles(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch roles"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initial API call.
   */
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchRoles(false);
    };

    loadInitialData();
  }, [fetchRoles]);

  /**
   * Search roles by role name and description.
   */
  const filteredRoles = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    if (!keyword) return roles;

    return roles.filter((role) => {
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

      return searchableText.includes(keyword);
    });
  }, [roles, searchTerm]);

  /**
   * Pagination calculation.
   * Only 10 roles will show per page.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRoles.length / ROLES_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * ROLES_PER_PAGE;
  const endIndex = startIndex + ROLES_PER_PAGE;

  const paginatedRoles = filteredRoles.slice(startIndex, endIndex);

  /**
   * Clears search filter.
   */
  const clearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  if (isLoading) {
    return <RolesLoading />;
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
              <ShieldCheck className="h-4 w-4" />
              Roles
            </p>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              System Roles
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
              View fixed access-control roles used across WorkSync HRMS. These
              roles control which user can access admin, HR, manager and team
              member features.
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

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RoleSummaryCard
          label="Total Roles"
          value={roles.length}
          icon={ShieldCheck}
        />

        <RoleSummaryCard
          label="Total Users"
          value={roles.reduce((sum, role) => sum + (role.totalUsers ?? 0), 0)}
          icon={UsersRound}
        />
      </div>

      {/* Roles list */}
      <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
        <CardContent className="p-0">
          {/* Filters */}
          <div className="space-y-4 border-b border-white/10 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
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
            <p className="text-right text-sm font-bold text-white/50">
              Users
            </p>
          </div>

          {/* Responsive list */}
          <div className="divide-y divide-white/10">
            {filteredRoles.length === 0 ? (
              <div className="p-10 text-center text-white/50">
                No roles found.
              </div>
            ) : (
              paginatedRoles.map((role) => (
                <div
                  key={role.id}
                  className="grid gap-5 p-5 hover:bg-white/[0.025] lg:grid-cols-[1.1fr_2fr_0.8fr] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/40 lg:hidden">Role</p>
                    <p className="break-words font-bold text-white">
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
    </section>
  );
}