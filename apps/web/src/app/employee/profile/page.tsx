"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { clearAuthSession } from "@/services/auth.service";
import { AuthUser } from "@/types/auth.types";

type ProfileUser = AuthUser & {
  status?: string | null;
  dateOfJoining?: string | null;
  manager?: {
    id?: string;
    fullName?: string;
    employeeCode?: string;
  } | null;
};

/**
 * Reads logged-in user from localStorage.
 */
function getStoredUser(): ProfileUser | null {
  if (typeof window === "undefined") return null;

  const user = localStorage.getItem("worksync_user");

  if (!user) return null;

  try {
    return JSON.parse(user) as ProfileUser;
  } catch {
    return null;
  }
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
 * Loading skeleton.
 */
function EmployeeProfileLoading() {
  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-44 rounded-[2rem] bg-white/10" />

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-3xl bg-white/10" />
          ))}
        </div>

        <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
      </section>
    </main>
  );
}

/**
 * Small profile info card.
 */
function ProfileInfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ElementType;
}) {
  return (
    <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
      <CardContent className="p-5">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm text-white/55">{label}</p>
        <p className="mt-1 break-words text-lg font-black text-white">
          {value || "—"}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Reusable details row.
 */
function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{value || "—"}</p>
    </div>
  );
}

export default function EmployeeProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isPageReady, setIsPageReady] = useState(false);

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
        toast.error("My Profile page is only for employee users.");

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
   * User initials for avatar.
   */
  const userInitials = useMemo(() => {
    if (!user?.fullName) return "EM";

    return user.fullName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  /**
   * Logout employee.
   */
  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  if (!isPageReady || !user || user.role !== "EMPLOYEE") {
    return <EmployeeProfileLoading />;
  }

  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto max-w-6xl space-y-6">
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
                <UserRound className="h-4 w-4" />
                My Profile
              </p>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Employee Profile
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
                View your employee identity, role, department, designation and
                contact information.
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
                Attendance
              </Button>

              <Button
                onClick={() => router.push("/employee/attendance/history")}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
              >
                <History className="mr-2 h-4 w-4" />
                History
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

        {/* Profile hero card */}
        <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] bg-amber-400 text-2xl font-black text-black shadow-lg shadow-amber-500/20">
                {userInitials}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="break-words text-3xl font-black text-white">
                  {user.fullName || "Employee"}
                </h2>

                <p className="mt-2 text-sm text-white/50">
                  {user.employeeCode || "Employee Code"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                    {user.status || "ACTIVE"}
                  </Badge>

                  <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">
                    {user.role || "EMPLOYEE"}
                  </Badge>

                  {user.department?.name ? (
                    <Badge className="border-white/10 bg-white/5 text-white/70">
                      {user.department.name}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <ProfileInfoCard
            label="Email"
            value={user.email || "—"}
            icon={Mail}
          />

          <ProfileInfoCard
            label="Mobile"
            value={user.mobile || "—"}
            icon={Phone}
          />

          <ProfileInfoCard
            label="Designation"
            value={user.designation?.name || "No designation"}
            icon={BadgeCheck}
          />
        </div>

        {/* Details section */}
        <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">
                Employee Details
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Your current HRMS profile information.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DetailRow label="Full Name" value={user.fullName} />
              <DetailRow label="Employee Code" value={user.employeeCode} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Mobile" value={user.mobile} />
              <DetailRow label="Role" value={user.role} />
              <DetailRow
                label="Department"
                value={user.department?.name || "No department"}
              />
              <DetailRow
                label="Designation"
                value={user.designation?.name || "No designation"}
              />
              <DetailRow
                label="Date of Joining"
                value={formatDate(user.dateOfJoining)}
              />
              <DetailRow
                label="Manager"
                value={
                  user.manager?.fullName
                    ? `${user.manager.fullName} ${
                        user.manager.employeeCode
                          ? `(${user.manager.employeeCode})`
                          : ""
                      }`
                    : "No manager assigned"
                }
              />
              <DetailRow label="Status" value={user.status || "ACTIVE"} />
            </div>
          </CardContent>
        </Card>

        {/* Note */}
        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-black text-white">Profile Information</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  This profile currently displays information available in your
                  login session. Later, it can be connected to a dedicated
                  employee profile API for live profile updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              onClick={() => router.push("/employee/dashboard")}
              className="h-11 rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>

            <Button
              onClick={() => router.push("/employee/attendance")}
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              Attendance
            </Button>

            <Button
              onClick={() => router.push("/employee/attendance/history")}
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <History className="mr-2 h-4 w-4" />
              History
            </Button>

            <Button
              onClick={() => router.push("/employee/tasks")}
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Tasks
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

