"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  LogOut,
  Mail,
  Phone,
  RefreshCcw,
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

type DashboardUser = AuthUser & Record<string, unknown>;

type QuickAction = {
  title: string;
  description: string;
  icon: ElementType;
  buttonLabel: string;
  href: string;
  isPrimary?: boolean;
};

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

function getStringValue(
  user: DashboardUser | null,
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

function formatRole(role?: string | null) {
  if (!role) return "Employee";

  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getInitials(name?: string | null) {
  if (!name) return "EM";

  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function EmployeeDashboardLoading() {
  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-56 rounded-[2rem] bg-white/10" />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-3xl bg-white/10" />
          ))}
        </div>

        <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
      </section>
    </main>
  );
}

function MetricCard({
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
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm font-semibold text-white/55">{label}</p>
        <p className="mt-1 text-2xl font-black tracking-tight text-white">
          {value}
        </p>
        <p className="mt-2 text-xs leading-5 text-white/45">{description}</p>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  buttonLabel,
  onClick,
  isPrimary = false,
}: {
  title: string;
  description: string;
  icon: ElementType;
  buttonLabel: string;
  onClick: () => void;
  isPrimary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-3xl p-5 text-left transition",
        "hover:-translate-y-1",
        isPrimary
          ? "border border-amber-300/25 bg-amber-300/10 hover:border-amber-300/45 hover:bg-amber-300/15"
          : "border border-white/10 bg-white/[0.04] hover:border-amber-300/30 hover:bg-white/[0.07]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-300/10 blur-3xl transition group-hover:bg-amber-300/20" />

      <div
        className={[
          "relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl",
          isPrimary
            ? "bg-amber-400 text-black shadow-lg shadow-amber-500/20"
            : "bg-amber-300/10 text-amber-300",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="relative text-xl font-black text-white">{title}</h3>

      <p className="relative mt-2 min-h-12 text-sm leading-6 text-white/55">
        {description}
      </p>

      <div className="relative mt-5 flex items-center text-sm font-bold text-amber-300">
        {buttonLabel}
        <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </button>
  );
}

function ProfileMiniRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-white/45">
        <Icon className="h-4 w-4 text-amber-300" />
        {label}
      </div>

      <span className="break-all text-right text-sm font-bold text-white">
        {value}
      </span>
    </div>
  );
}

export default function EmployeeDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
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
        toast.error("Employee dashboard is only for employee users.");

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
    const profileUser = user as DashboardUser | null;

    return {
      fullName: getStringValue(profileUser, ["fullName", "name"], "Employee"),
      employeeCode: getStringValue(profileUser, [
        "employeeCode",
        "code",
        "userCode",
      ]),
      email: getStringValue(profileUser, ["email", "userEmail"]),
      mobile: getStringValue(profileUser, ["mobile", "phone", "phoneNo"]),
      role: getStringValue(profileUser, ["role"], "EMPLOYEE"),
    };
  }, [user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [
      {
        title: "Mark Attendance",
        description:
          "Check-in or check-out with your current location and photo proof.",
        icon: CalendarCheck,
        buttonLabel: "Open Attendance",
        href: "/employee/attendance",
        isPrimary: true,
      },
      {
        title: "Attendance History",
        description:
          "View your past attendance records, maps and uploaded photo proof.",
        icon: History,
        buttonLabel: "Open History",
        href: "/employee/attendance/history",
      },
      {
        title: "My Tasks",
        description:
          "View assigned tasks with status, priority and due date filters.",
        icon: ClipboardList,
        buttonLabel: "Open Tasks",
        href: "/employee/tasks",
      },
      {
        title: "My Profile",
        description:
          "View your employee details, role, contact and account information.",
        icon: UserRound,
        buttonLabel: "Open Profile",
        href: "/employee/profile",
      },
    ];

    return Array.from(new Map(actions.map((item) => [item.href, item])).values());
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  if (!isPageReady || !user || user.role !== "EMPLOYEE") {
    return <EmployeeDashboardLoading />;
  }

  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        {/* Premium Hero */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[2rem] border border-amber-200/30 bg-[#17100b]/75 p-6 shadow-2xl shadow-black/30 sm:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-200">
                    <Sparkles className="h-4 w-4" />
                    Employee Portal
                  </div>

                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                    {greeting}, {profile.fullName}
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                    Manage attendance, track assigned tasks, view attendance
                    history and access your profile from one premium employee
                    workspace.
                  </p>
                </div>

                <div className="shrink-0 sm:hidden">
                  <ResponsivePageActions
                    actions={[
                      {
                        label: "Mark Attendance",
                        icon: CalendarCheck,
                        onClick: () => router.push("/employee/attendance"),
                        variant: "primary",
                      },
                      {
                        label: "View Tasks",
                        icon: ClipboardList,
                        onClick: () => router.push("/employee/tasks"),
                      },
                      {
                        label: "Profile",
                        icon: UserRound,
                        onClick: () => router.push("/employee/profile"),
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

              <div className="mt-6 hidden sm:block">
                <ResponsivePageActions
                  actions={[
                    {
                      label: "Mark Attendance",
                      icon: CalendarCheck,
                      onClick: () => router.push("/employee/attendance"),
                      variant: "primary",
                    },
                    {
                      label: "View Tasks",
                      icon: ClipboardList,
                      onClick: () => router.push("/employee/tasks"),
                    },
                    {
                      label: "Profile",
                      icon: UserRound,
                      onClick: () => router.push("/employee/profile"),
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

            <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-amber-400 text-2xl font-black text-black shadow-lg shadow-amber-500/20">
                  {getInitials(profile.fullName)}
                </div>

                <div className="min-w-0">
                  <p className="break-words text-xl font-black text-white">
                    {profile.fullName}
                  </p>

                  <p className="mt-1 text-sm text-white/50">
                    {profile.employeeCode}
                  </p>

                  <Badge className="mt-3 border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                    Active Session
                  </Badge>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <ProfileMiniRow
                  icon={ShieldCheck}
                  label="Role"
                  value={formatRole(profile.role)}
                />

                <ProfileMiniRow
                  icon={Phone}
                  label="Mobile"
                  value={profile.mobile}
                />

                <ProfileMiniRow icon={Mail} label="Email" value={profile.email} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Professional metric cards */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            label="Attendance"
            value="Ready"
            description="Mark check-in or check-out with location and photo proof."
            icon={CalendarCheck}
            tone="default"
          />

          <MetricCard
            label="Assigned Tasks"
            value="Track"
            description="View your task list, priority, status and due dates."
            icon={ClipboardList}
            tone="info"
          />

          <MetricCard
            label="Session"
            value="Active"
            description="Your employee session is currently active and secure."
            icon={ShieldCheck}
            tone="success"
          />

          <MetricCard
            label="Profile"
            value="Verified"
            description="Access employee identity and contact information."
            icon={CheckCircle2}
            tone="warning"
          />
        </motion.div>

        {/* Main quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
        >
          <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                    <Clock3 className="h-3.5 w-3.5" />
                    Daily Workflow
                  </div>

                  <h2 className="text-2xl font-black text-white">
                    Quick Actions
                  </h2>

                  <p className="mt-1 text-sm text-white/50">
                    Start your daily employee workflow from here.
                  </p>
                </div>

                <Button
                  onClick={() => router.push("/employee/profile")}
                  variant="outline"
                  className="h-10 rounded-xl border-amber-200/30 bg-white/5 px-4 font-bold text-white hover:bg-white/10"
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  Open Profile
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {quickActions.map((action) => (
                  <QuickActionCard
                    key={action.href}
                    title={action.title}
                    description={action.description}
                    icon={action.icon}
                    buttonLabel={action.buttonLabel}
                    isPrimary={action.isPrimary}
                    onClick={() => router.push(action.href)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Professional note */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                  <RefreshCcw className="h-5 w-5" />
                </div>

                <div className="flex-1">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-lg font-black text-white">
                        Attendance Reminder
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-white/55">
                        You can check-in and check-out from your actual work
                        location. Location restriction is not applied right now,
                        but your captured location and photo proof will be
                        visible to Admin/HR for verification.
                      </p>
                    </div>

                    <Button
                      onClick={() => router.push("/employee/attendance")}
                      variant="outline"
                      className="h-10 rounded-xl border-amber-200/30 bg-white/5 px-4 font-bold text-white hover:bg-white/10"
                    >
                      Go to Attendance
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </main>
  );
}