"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ClipboardList,
  Clock3,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import ResponsivePageActions from "@/components/common/ResponsivePageActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { clearAuthSession } from "@/services/auth.service";
import { AuthUser } from "@/types/auth.types";

type ProfileUser = AuthUser & Record<string, unknown>;

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

function getStringValue(
  user: ProfileUser | null,
  keys: string[],
  fallback = "—"
) {
  if (!user) return fallback;

  for (const key of keys) {
    const value = user[key];

    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }

  return fallback;
}

function getNestedStringValue(
  user: ProfileUser | null,
  objectKey: string,
  valueKeys: string[],
  fallback = "—"
) {
  if (!user) return fallback;

  const objectValue = user[objectKey];

  if (!objectValue || typeof objectValue !== "object") {
    return fallback;
  }

  const record = objectValue as Record<string, unknown>;

  for (const key of valueKeys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }

  return fallback;
}

function getManagerDisplay(user: ProfileUser | null) {
  if (!user) return "No manager assigned";

  const manager = user.manager;

  if (manager && typeof manager === "object") {
    const managerRecord = manager as Record<string, unknown>;

    const fullName =
      typeof managerRecord.fullName === "string" && managerRecord.fullName.trim()
        ? managerRecord.fullName
        : "";

    const employeeCode =
      typeof managerRecord.employeeCode === "string" &&
      managerRecord.employeeCode.trim()
        ? managerRecord.employeeCode
        : "";

    if (fullName && employeeCode) return `${fullName} (${employeeCode})`;
    if (fullName) return fullName;
    if (employeeCode) return employeeCode;
  }

  return getStringValue(
    user,
    ["managerName", "reportingManagerName"],
    "No manager assigned"
  );
}

function formatDate(value?: string | null) {
  if (!value || value === "—") return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatRole(role?: string | null) {
  if (!role || role === "—") return "Employee";

  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getInitials(name: string) {
  if (!name || name === "—") return "EM";

  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function EmployeeProfileLoading() {
  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-56 rounded-[2rem] bg-white/10" />

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

function ProfileInfoCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  icon: ElementType;
  tone?: "default" | "success" | "warning" | "info";
}) {
  const toneClass = {
    default: "bg-amber-300/10 text-amber-300",
    success: "bg-emerald-300/10 text-emerald-300",
    warning: "bg-orange-300/10 text-orange-300",
    info: "bg-blue-300/10 text-blue-200",
  };

  return (
    <Card className="group overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
      <CardContent className="relative p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/5 blur-2xl transition group-hover:bg-amber-300/10" />

        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm font-semibold text-white/55">{label}</p>
        <p className="mt-1 break-words text-xl font-black text-white">
          {value}
        </p>
        <p className="mt-2 text-xs leading-5 text-white/45">{description}</p>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/40">
        <Icon className="h-3.5 w-3.5 text-amber-300" />
        {label}
      </div>

      <p className="break-words text-sm font-bold text-white sm:text-base">
        {value || "—"}
      </p>
    </div>
  );
}

export default function EmployeeProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isPageReady, setIsPageReady] = useState(false);

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

        if (storedUser.role === "MANAGER") {
          router.replace("/manager/dashboard");
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

  const profile = useMemo(() => {
    const departmentFromNested = getNestedStringValue(user, "department", [
      "name",
      "departmentName",
    ]);

    const designationFromNested = getNestedStringValue(user, "designation", [
      "name",
      "designationName",
    ]);

    const dateOfJoining = getStringValue(user, [
      "dateOfJoining",
      "joiningDate",
      "joinedAt",
    ]);

    return {
      fullName: getStringValue(user, ["fullName", "name"], "Employee"),
      employeeCode: getStringValue(user, [
        "employeeCode",
        "code",
        "userCode",
      ]),
      email: getStringValue(user, ["email", "userEmail"]),
      mobile: getStringValue(user, ["mobile", "phone", "phoneNo"]),
      role: getStringValue(user, ["role"], "EMPLOYEE"),
      status: getStringValue(user, ["status"], "ACTIVE"),
      department:
        departmentFromNested !== "—"
          ? departmentFromNested
          : getStringValue(user, ["departmentName"], "No department"),
      designation:
        designationFromNested !== "—"
          ? designationFromNested
          : getStringValue(user, ["designationName"], "No designation"),
      dateOfJoining: formatDate(dateOfJoining),
      manager: getManagerDisplay(user),
    };
  }, [user]);

  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  if (!isPageReady || !user || user.role !== "EMPLOYEE") {
    return <EmployeeProfileLoading />;
  }

  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
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

          <div className="relative flex flex-row items-start justify-between gap-4 lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] border border-amber-300/25 bg-amber-400 text-3xl font-black text-black shadow-2xl shadow-black/30">
                  {getInitials(profile.fullName)}
                </div>

                <div className="min-w-0">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-200">
                    <Sparkles className="h-4 w-4" />
                    Employee Profile
                  </div>

                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                    {profile.fullName}
                  </h1>

                  <p className="mt-3 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                    View your employee identity, role, department, designation,
                    manager and contact information.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                      {profile.status}
                    </Badge>

                    <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">
                      {formatRole(profile.role)}
                    </Badge>

                    <Badge className="border-white/10 bg-white/5 text-white/70">
                      {profile.department}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <ResponsivePageActions
                actions={[
                  {
                    label: "Dashboard",
                    icon: LayoutDashboard,
                    onClick: () => router.push("/employee/dashboard"),
                  },
                  {
                    label: "Attendance",
                    icon: CalendarCheck,
                    onClick: () => router.push("/employee/attendance"),
                  },
                  {
                    label: "Tasks",
                    icon: ClipboardList,
                    onClick: () => router.push("/employee/tasks"),
                  },
                  {
                    label: "History",
                    icon: History,
                    onClick: () => router.push("/employee/attendance/history"),
                  },
                  {
                    label: "Logout",
                    icon: LogOut,
                    onClick: handleLogout,
                    variant: "danger",
                  },
                ]}
              />
            </div>
          </div>
        </motion.div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProfileInfoCard
            label="Employee Code"
            value={profile.employeeCode}
            description="Unique employee code."
            icon={BadgeCheck}
          />

          <ProfileInfoCard
            label="Role"
            value={formatRole(profile.role)}
            description="Current access control role."
            icon={ShieldCheck}
            tone="success"
          />

          <ProfileInfoCard
            label="Department"
            value={profile.department}
            description="Assigned company department."
            icon={Building2}
            tone="info"
          />

          <ProfileInfoCard
            label="Designation"
            value={profile.designation}
            description="Assigned work designation."
            icon={BriefcaseBusiness}
            tone="warning"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          {/* Details section */}
          <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-white">
                    Employee Details
                  </h2>
                  <p className="text-sm text-white/50">
                    Your current HRMS profile information.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailRow
                  icon={UserRound}
                  label="Full Name"
                  value={profile.fullName}
                />

                <DetailRow
                  icon={BadgeCheck}
                  label="Employee Code"
                  value={profile.employeeCode}
                />

                <DetailRow icon={Mail} label="Email" value={profile.email} />

                <DetailRow icon={Phone} label="Mobile" value={profile.mobile} />

                <DetailRow
                  icon={ShieldCheck}
                  label="Role"
                  value={formatRole(profile.role)}
                />

                <DetailRow
                  icon={Building2}
                  label="Department"
                  value={profile.department}
                />

                <DetailRow
                  icon={BriefcaseBusiness}
                  label="Designation"
                  value={profile.designation}
                />

                <DetailRow
                  icon={Clock3}
                  label="Date of Joining"
                  value={profile.dateOfJoining}
                />

                <DetailRow
                  icon={UserRound}
                  label="Manager"
                  value={profile.manager}
                />

                <DetailRow
                  icon={ShieldCheck}
                  label="Status"
                  value={profile.status}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300">
                  <ClipboardList className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-white">
                    Employee Quick Actions
                  </h2>
                  <p className="text-sm text-white/50">
                    Open frequently used employee modules.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <Button
                  onClick={() => router.push("/employee/dashboard")}
                  className="h-12 justify-start rounded-xl bg-amber-400 px-4 font-black text-black hover:bg-amber-300"
                >
                  <LayoutDashboard className="mr-3 h-5 w-5" />
                  Open Dashboard
                </Button>

                <Button
                  onClick={() => router.push("/employee/attendance")}
                  variant="outline"
                  className="h-12 justify-start rounded-xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <CalendarCheck className="mr-3 h-5 w-5 text-amber-300" />
                  Mark Attendance
                </Button>

                <Button
                  onClick={() => router.push("/employee/attendance/history")}
                  variant="outline"
                  className="h-12 justify-start rounded-xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <History className="mr-3 h-5 w-5 text-amber-300" />
                  Attendance History
                </Button>

                <Button
                  onClick={() => router.push("/employee/tasks")}
                  variant="outline"
                  className="h-12 justify-start rounded-xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ClipboardList className="mr-3 h-5 w-5 text-amber-300" />
                  My Tasks
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Note */}
        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">
                  Profile Data Source
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  This profile currently displays information available in your
                  login session. Later, it can be connected to a dedicated
                  employee profile API for live profile updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}