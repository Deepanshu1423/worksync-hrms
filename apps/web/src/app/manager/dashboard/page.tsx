"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { clearAuthSession } from "@/services/auth.service";
import { AuthUser } from "@/types/auth.types";

/**
 * Reads logged-in user from localStorage.
 *
 * Important:
 * This function must only run in browser-side code.
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
 * Loading screen while checking manager session.
 */
function ManagerDashboardLoading() {
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

/**
 * Reusable metric card.
 */
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

/**
 * Reusable quick action card.
 */
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

export default function ManagerDashboardPage() {
  const router = useRouter();

  /**
   * Do not read localStorage directly in initial state.
   * This prevents hydration mismatch.
   */
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPageReady, setIsPageReady] = useState(false);

  /**
   * Client-side route protection.
   *
   * Only MANAGER users can access this dashboard.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = localStorage.getItem("worksync_access_token");
      const storedUser = getStoredUser();

      if (!token || !storedUser) {
        router.replace("/login");
        return;
      }

      if (storedUser.role !== "MANAGER") {
        toast.error("Manager dashboard is only for manager users.");

        if (storedUser.role === "SUPER_ADMIN" || storedUser.role === "ADMIN") {
          router.replace("/admin/dashboard");
          return;
        }

        if (storedUser.role === "EMPLOYEE") {
          router.replace("/employee/dashboard");
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
   * Manager initials for avatar card.
   */
  const userInitials = useMemo(() => {
    if (!user?.fullName) return "MG";

    return user.fullName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  /**
   * Greeting text based on current browser time.
   */
  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  /**
   * Logout manager.
   */
  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  if (!isPageReady || !user || user.role !== "MANAGER") {
    return <ManagerDashboardLoading />;
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
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-200">
                <Sparkles className="h-4 w-4" />
                Manager Portal
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                {greeting}, {user.fullName || "Manager"}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                Monitor team attendance, track team tasks, mark your own
                attendance and manage your manager profile from one premium
                workspace.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={() => router.push("/manager/team-attendance")}
                  className="h-11 rounded-xl bg-amber-400 px-5 font-black text-black hover:bg-amber-300"
                >
                  <UsersRound className="mr-2 h-4 w-4" />
                  Team Attendance
                </Button>

                <Button
                  onClick={() => router.push("/manager/team-tasks")}
                  variant="outline"
                  className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Team Tasks
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

            <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-amber-400 text-2xl font-black text-black shadow-lg shadow-amber-500/20">
                  {userInitials}
                </div>

                <div className="min-w-0">
                  <p className="break-words text-xl font-black text-white">
                    {user.fullName || "Manager"}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {user.employeeCode || "Manager Code"}
                  </p>

                  <Badge className="mt-3 border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                    Active Session
                  </Badge>
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/45">Role</span>
                  <span className="text-sm font-black text-white">
                    {user.role || "MANAGER"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/45">Mobile</span>
                  <span className="break-words text-right text-sm font-bold text-white">
                    {user.mobile || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/45">Email</span>
                  <span className="break-all text-right text-sm font-bold text-white">
                    {user.email || "—"}
                  </span>
                </div>
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
            label="Team Attendance"
            value="Monitor"
            description="Review team attendance with maps and photo proof."
            icon={UsersRound}
            tone="default"
          />

          <MetricCard
            label="Team Tasks"
            value="Track"
            description="Track task status, priority, due dates and employees."
            icon={ClipboardList}
            tone="info"
          />

          <MetricCard
            label="Manager Session"
            value="Active"
            description="Your manager role session is secure and protected."
            icon={ShieldCheck}
            tone="success"
          />

          <MetricCard
            label="Profile"
            value="Verified"
            description="Access manager identity and contact information."
            icon={BadgeCheck}
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
                    Manager Workflow
                  </div>

                  <h2 className="text-2xl font-black text-white">
                    Manager Quick Actions
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    Monitor your team and manage your daily manager workflow.
                  </p>
                </div>

                <Button
                  onClick={() => router.push("/manager/profile")}
                  variant="outline"
                  className="h-10 rounded-xl border-amber-200/30 bg-white/5 px-4 font-bold text-white hover:bg-white/10"
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  Open Profile
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <QuickActionCard
                  title="Team Attendance"
                  description="View attendance records, maps and photo proof of assigned team members."
                  icon={UsersRound}
                  buttonLabel="Open Attendance"
                  isPrimary
                  onClick={() => router.push("/manager/team-attendance")}
                />

                <QuickActionCard
                  title="Team Tasks"
                  description="View tasks assigned to your team members and track current progress."
                  icon={ClipboardList}
                  buttonLabel="Open Tasks"
                  onClick={() => router.push("/manager/team-tasks")}
                />

                <QuickActionCard
                  title="My Attendance"
                  description="Mark your own check-in/check-out with location and photo proof."
                  icon={CalendarCheck}
                  buttonLabel="Mark Attendance"
                  onClick={() => router.push("/manager/attendance")}
                />

                <QuickActionCard
                  title="My History"
                  description="View your own attendance history with maps, photo proof and work time."
                  icon={History}
                  buttonLabel="Open History"
                  onClick={() => router.push("/manager/attendance/history")}
                />

                <QuickActionCard
                  title="My Profile"
                  description="View manager profile, role, department and contact information."
                  icon={UserRound}
                  buttonLabel="Open Profile"
                  onClick={() => router.push("/manager/profile")}
                />
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
                  <BarChart3 className="h-5 w-5" />
                </div>

                <div className="flex-1">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-lg font-black text-white">
                        Manager Scope
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-white/55">
                        Manager pages are designed to show only assigned team
                        data. Admin and Super Admin users continue to manage
                        full organization data from the Admin dashboard.
                      </p>
                    </div>

                    <Button
                      onClick={() => router.push("/manager/team-attendance")}
                      variant="outline"
                      className="h-10 rounded-xl border-amber-200/30 bg-white/5 px-4 font-bold text-white hover:bg-white/10"
                    >
                      View Team
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