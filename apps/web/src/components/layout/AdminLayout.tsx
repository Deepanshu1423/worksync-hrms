"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Settings,
  ShieldCheck,
  SunMedium,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { clearAuthSession } from "@/services/auth.service";
import { AuthUser } from "@/types/auth.types";

type AdminLayoutProps = {
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: {
    label: string;
    href: string;
    icon: React.ElementType;
  }[];
};

/**
 * Sidebar navigation items.
 * All created admin pages are added here.
 */
const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Employees",
    href: "/admin/employees",
    icon: UsersRound,
  },
  {
    label: "Attendance",
    href: "/admin/attendance",
    icon: CalendarCheck,
  },
  {
    label: "Projects",
    href: "/admin/projects",
    icon: BriefcaseBusiness,
  },
  {
    label: "Tasks",
    href: "/admin/tasks",
    icon: ClipboardList,
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    children: [
      {
        label: "Departments",
        href: "/admin/settings/departments",
        icon: Building2,
      },
      {
        label: "Designations",
        href: "/admin/settings/designations",
        icon: BadgeCheck,
      },
      {
        label: "Office Locations",
        href: "/admin/settings/office-locations",
        icon: MapPin,
      },
      {
        label: "Roles",
        href: "/admin/settings/roles",
        icon: ShieldCheck,
      },
    ],
  },
];

/**
 * Reads logged-in user from localStorage.
 */
const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;

  const user = localStorage.getItem("worksync_user");

  if (!user) return null;

  try {
    return JSON.parse(user) as AuthUser;
  } catch {
    return null;
  }
};

/**
 * Sidebar component.
 * Same sidebar is used for desktop and mobile drawer.
 */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const isSettingsRoute = pathname.startsWith("/admin/settings");
  const [isSettingsOpen, setIsSettingsOpen] = useState(isSettingsRoute);

  /**
   * Keep settings menu open when user is inside any settings page.
   */
  useEffect(() => {
    if (isSettingsRoute) {
      setIsSettingsOpen(true);
    }
  }, [isSettingsRoute]);

  /**
   * Navigate to selected route and close mobile drawer if required.
   */
  const handleNavigate = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <aside className="flex h-full flex-col bg-[#0d0906] text-white">
      {/* Brand */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-lg shadow-amber-500/20">
            <SunMedium className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-black tracking-tight">WorkSync</h2>
            <p className="text-xs text-white/45">Solar HRMS</p>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = Boolean(item.children?.length);

          /**
           * Parent route should be active if current path starts with that href.
           * Example: /admin/settings/departments should highlight Settings.
           */
          const isActive = hasChildren
            ? pathname === item.href || pathname.startsWith(`${item.href}/`)
            : pathname === item.href;

          if (hasChildren) {
            return (
              <div key={item.href} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                    isActive
                      ? "bg-amber-400 text-black shadow-lg shadow-amber-500/20"
                      : "text-white/65 hover:bg-white/[0.08] hover:text-white",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown
                    className={[
                      "h-4 w-4 transition-transform",
                      isSettingsOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>

                {isSettingsOpen ? (
                  <div className="ml-4 space-y-1 border-l border-white/10 pl-3">
                    <button
                      type="button"
                      onClick={() => handleNavigate(item.href)}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                        pathname === item.href
                          ? "bg-white/[0.08] text-amber-200"
                          : "text-white/55 hover:bg-white/[0.08] hover:text-white",
                      ].join(" ")}
                    >
                      <Settings className="h-4 w-4" />
                      Overview
                    </button>

                    {item.children?.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = pathname === child.href;

                      return (
                        <button
                          key={child.href}
                          type="button"
                          onClick={() => handleNavigate(child.href)}
                          className={[
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                            isChildActive
                              ? "bg-white/[0.08] text-amber-200"
                              : "text-white/55 hover:bg-white/[0.08] hover:text-white",
                          ].join(" ")}
                        >
                          <ChildIcon className="h-4 w-4" />
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => handleNavigate(item.href)}
              className={[
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                isActive
                  ? "bg-amber-400 text-black shadow-lg shadow-amber-500/20"
                  : "text-white/65 hover:bg-white/[0.08] hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom card */}
      <div className="p-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-300">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <p className="text-sm font-bold">Secure Access</p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            Role based dashboard with protected HRMS modules.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /**
   * Client-side route protection.
   * If token/user is missing, user is redirected to login page.
   */
  useEffect(() => {
    const token = localStorage.getItem("worksync_access_token");
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    /**
     * Admin layout access.
     * HR is included because HR/Admin can manage attendance and reports.
     */
    if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(storedUser.role)) {
      router.replace("/login");
      return;
    }

    setUser(storedUser);
    setIsCheckingAuth(false);
  }, [router]);

  /**
   * User initials for avatar.
   */
  const userInitials = useMemo(() => {
    if (!user?.fullName) return "WS";

    return user.fullName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  /**
   * Logout handler.
   */
  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0d0906] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
          <p className="text-sm text-white/60">Checking secure session...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0906] text-white">
      {/* Desktop Sidebar */}
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 lg:block">
        <SidebarContent />
      </div>

      {/* Main Area */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0906]/85 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile menu */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-white hover:bg-white/10 lg:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent
                  side="left"
                  className="w-72 border-white/10 bg-[#0d0906] p-0"
                >
                  <SidebarContent
                    onNavigate={() => setIsMobileMenuOpen(false)}
                  />
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <p className="text-sm text-white/45">Welcome back,</p>
                <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">
                  {user?.fullName || "Admin"}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Badge className="hidden border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-100 hover:bg-amber-300/10 sm:inline-flex">
                {user?.role || "ADMIN"}
              </Badge>

              <Avatar className="h-10 w-10 border border-white/10">
                <AvatarFallback className="bg-amber-400 text-sm font-black text-black">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              <Button
                onClick={handleLogout}
                variant="ghost"
                className="hidden text-white/65 hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>

              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="text-white/65 hover:bg-white/10 hover:text-white sm:hidden"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-80px)] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}