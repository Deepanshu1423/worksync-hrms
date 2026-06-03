"use client";

import { FormEvent, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  SunMedium,
  UserRound,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/services/api.service";
import { AuthUser } from "@/types/auth.types";

type LoginResponse = {
  success: boolean;
  message?: string;
  data?: {
    accessToken?: string;
    token?: string;
    user?: AuthUser;
    authUser?: AuthUser;
  };
  accessToken?: string;
  token?: string;
  user?: AuthUser;
};

type ApiErrorResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
  errors?: { message?: string; path?: string[] }[];
};

/**
 * Redirect user according to backend role.
 */
function getRedirectPathByRole(role?: string) {
  const normalizedRole = role?.trim().toUpperCase();

  if (normalizedRole === "SUPER_ADMIN" || normalizedRole === "ADMIN") {
    return "/admin/dashboard";
  }

  if (normalizedRole === "MANAGER") {
    return "/manager/dashboard";
  }

  if (normalizedRole === "EMPLOYEE") {
    return "/employee/dashboard";
  }

  return "/login";
}

/**
 * Reads saved user safely from localStorage.
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
    return "Invalid email/mobile or password.";
  }

  if (statusCode === 403) {
    return "Your account does not have permission to login.";
  }

  if (statusCode === 404) {
    return "Login API route not found. Please check backend auth route.";
  }

  if (statusCode >= 500) {
    return "Server error while signing in. Please try again after some time.";
  }

  if (Array.isArray(data?.errors)) {
    return data.errors[0]?.message || fallback;
  }

  if (Array.isArray(data?.message)) {
    return data.message[0] || fallback;
  }

  if (typeof data?.message === "string") {
    const lowerMessage = data.message.toLowerCase();

    if (
      lowerMessage.includes("invalid") ||
      lowerMessage.includes("incorrect") ||
      lowerMessage.includes("password") ||
      lowerMessage.includes("credential")
    ) {
      return "Invalid email/mobile or password.";
    }

    return data.message;
  }

  if (typeof data?.error === "string") {
    return data.error;
  }

  return fallback;
}

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);

  /**
   * If already logged in, redirect according to saved role.
   * This runs only on browser side to prevent hydration mismatch.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = localStorage.getItem("worksync_access_token");
      const user = getStoredUser();

      if (token && user?.role) {
        router.replace(getRedirectPathByRole(user.role));
        return;
      }

      setIsPageReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [router]);

  /**
   * Login submit handler.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      toast.error("Email or mobile is required.");
      return;
    }

    if (!password.trim()) {
      toast.error("Password is required.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await api.post<LoginResponse>("/auth/login", {
        identifier: cleanIdentifier,
        password,
      });

      const accessToken =
        response.data.data?.accessToken ||
        response.data.data?.token ||
        response.data.accessToken ||
        response.data.token;

      const user =
        response.data.data?.user ||
        response.data.data?.authUser ||
        response.data.user;

      if (!accessToken || !user) {
        toast.error("Login response is invalid. Please check backend response.");
        return;
      }

      localStorage.setItem("worksync_access_token", accessToken);
      localStorage.setItem("worksync_user", JSON.stringify(user));

      toast.success("Login successful.");

      router.replace(getRedirectPathByRole(user.role));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to login. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isPageReady) {
    return (
      <main className="min-h-screen bg-[#0d0906] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
        </div>
      </main>
    );
  }

  return (
    <main className="login-page relative min-h-screen overflow-hidden bg-[#0d0906] text-white">
      {/* Background image */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.99]"
        style={{
          backgroundImage: "url('/images/login-bg.jpg.png')",
        }}
      />

      {/* Theme-aware overlay */}
      <div className="login-theme-overlay pointer-events-none absolute inset-0" />

      {/* Decorative glow */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-amber-200/25 bg-[#17100b]/30 shadow-2xl shadow-black/40 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left branding section */}
          <div className="relative hidden min-h-[680px] overflow-hidden border-r border-amber-100/15 p-10 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.18),transparent_35%)]" />

            <div className="relative">
              <div className="mb-10 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-lg shadow-amber-500/20">
                  <SunMedium className="h-7 w-7" />
                </div>

                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    WorkSync HRMS
                  </h2>
                  <p className="text-sm text-white/55">
                    Solar HRMS Platform
                  </p>
                </div>
              </div>

              <h1 className="max-w-xl text-5xl font-black leading-tight tracking-tight text-white">
                Workforce platform for solar power companies.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-white/65">
                Manage employees, geo attendance, tasks, projects, reports and
                HR workflows from one protected dashboard.
              </p>
            </div>

            <div className="relative grid gap-4">
              <div className="rounded-3xl border border-amber-100/15 bg-white/[0.045] p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-black text-white">Secure Role Access</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Admin, Manager and Employee users are redirected to their own
                  protected dashboards automatically.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-amber-100/15 bg-white/[0.045] p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className="font-black text-white">Geo Attendance</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Location and photo proof based attendance.
                  </p>
                </div>

                <div className="rounded-3xl border border-amber-100/15 bg-white/[0.045] p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <h3 className="font-black text-white">Team Workflow</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Tasks, teams and HR operations in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right login section */}
          <div className="flex min-h-[680px] items-center justify-center p-5 sm:p-8 lg:p-12">
            <div className="w-full max-w-md">
              {/* Mobile brand */}
              <div className="mb-8 flex items-center gap-4 lg:hidden">
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-amber-400 p-3 text-black shadow-lg shadow-amber-500/20">
                  <SunMedium className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white">
                    WorkSync HRMS
                  </h2>
                  <p className="text-sm text-white/55">
                    Solar HRMS Platform
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-amber-100/15 bg-[#17100b]/30 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
                <div className="mb-8">
                  <div className="mb-4 inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-1.5 text-xs font-bold text-amber-200">
                    Secure Login
                  </div>

                  <h1 className="text-4xl font-black tracking-tight text-white">
                    Welcome back
                  </h1>

                  <p className="mt-3 text-sm leading-6 text-white/55">
                    Sign in to access your dashboard according to your role.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Identifier */}
                  <div>
                    <label
                      htmlFor="identifier"
                      className="mb-2 block text-sm font-bold text-white/80"
                    >
                      Email or Mobile
                    </label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-300" />

                      <input
                        id="identifier"
                        type="text"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                        placeholder="Enter email or mobile"
                        autoComplete="username"
                        className="h-12 w-full rounded-2xl border border-amber-100/20 bg-white/[0.04] pl-12 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-amber-300/60 focus:bg-white/[0.06]"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-bold text-white/80"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-300" />

                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter password"
                        autoComplete="current-password"
                        className="h-12 w-full rounded-2xl border border-amber-100/20 bg-white/[0.04] pl-12 pr-12 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-amber-300/60 focus:bg-white/[0.06]"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group flex h-12 w-full items-center justify-center rounded-2xl bg-amber-400 text-sm font-black text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="ml-2 h-5 w-5 transition group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-amber-100/15 bg-white/[0.035] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300">
                      <LockKeyhole className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-white">
                        Role based redirect enabled
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/50">
                        Admin users open Admin Dashboard, Manager users open
                        Manager Dashboard, and Employee users open Employee
                        Dashboard automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-white/45">
                WorkSync HRMS • Solar workforce management platform
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Login page theme overlays */}
      <style jsx global>{`
        html[data-theme="dark"] .login-theme-overlay {
          background:
            radial-gradient(
              circle at 18% 20%,
              rgba(251, 191, 36, 0.2),
              transparent 34%
            ),
            linear-gradient(
              135deg,
              rgba(13, 9, 6, 0.97),
              rgba(23, 16, 11, 0.91),
              rgba(13, 9, 6, 0.98)
            );
        }

        html[data-theme="light"] .login-theme-overlay {
          background:
            radial-gradient(
              circle at 18% 20%,
              rgba(217, 154, 43, 0.22),
              transparent 34%
            ),
            linear-gradient(
              135deg,
              rgba(248, 241, 231, 0.92),
              rgba(255, 250, 242, 0.86),
              rgba(248, 241, 231, 0.94)
            );
        }

        html[data-theme="light"] .login-page .bg-\\[\\#17100b\\]\\/80,
        html[data-theme="light"] .login-page .bg-\\[\\#17100b\\]\\/90 {
          background-color: rgba(255, 250, 242, 0.88) !important;
        }

        html[data-theme="light"] .login-page .text-white {
          color: #2b1a0f !important;
        }

        html[data-theme="light"] .login-page .text-white\\/80 {
          color: rgba(43, 26, 15, 0.8) !important;
        }

        html[data-theme="light"] .login-page .text-white\\/65,
        html[data-theme="light"] .login-page .text-white\\/55,
        html[data-theme="light"] .login-page .text-white\\/50,
        html[data-theme="light"] .login-page .text-white\\/45,
        html[data-theme="light"] .login-page .text-white\\/35 {
          color: rgba(43, 26, 15, 0.58) !important;
        }

        html[data-theme="light"] .login-page .border-amber-100\\/15,
        html[data-theme="light"] .login-page .border-amber-100\\/20,
        html[data-theme="light"] .login-page .border-amber-200\\/25 {
          border-color: rgba(120, 72, 28, 0.18) !important;
        }

        html[data-theme="light"] .login-page input {
          color: #2b1a0f !important;
          background-color: rgba(120, 72, 28, 0.06) !important;
        }

        html[data-theme="light"] .login-page input::placeholder {
          color: rgba(43, 26, 15, 0.42) !important;
        }
      `}</style>
    </main>
  );
}