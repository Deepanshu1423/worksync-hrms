"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock3,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  LocateFixed,
  LogOut,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Timer,
  Upload,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  checkInAttendance,
  checkOutAttendance,
  getMyTodayAttendance,
} from "@/services/employee-attendance.service";
import { clearAuthSession } from "@/services/auth.service";
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

type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

/**
 * Reads logged-in manager from localStorage.
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
    return "You do not have permission to perform this action.";
  }

  if (statusCode === 404) {
    return "Attendance API route not found. Please check backend attendance routes.";
  }

  if (statusCode >= 500) {
    return "Server error while processing attendance. Please try again after some time.";
  }

  if (Array.isArray(data?.errors)) {
    const firstError = data.errors[0];
    const path = firstError?.path || [];
    const message = firstError?.message || "";

    if (path.includes("latitude") || path.includes("longitude")) {
      return "Location is required. Please capture your current location again.";
    }

    if (path.includes("photo")) {
      return "Invalid photo. Please upload or capture a valid image.";
    }

    return message || fallback;
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
    const message = data.message;
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("invalid `prisma.") ||
      lowerMessage.includes("unknown field") ||
      lowerMessage.includes("available options are marked")
    ) {
      return "Backend database field mismatch. Please check attendance Prisma model and service fields.";
    }

    if (
      lowerMessage.includes("file too large") ||
      lowerMessage.includes("multipart") ||
      lowerMessage.includes("upload")
    ) {
      return "Photo upload failed. Please select a smaller valid image and try again.";
    }

    if (
      lowerMessage.includes("latitude") ||
      lowerMessage.includes("longitude") ||
      lowerMessage.includes("location")
    ) {
      return "Location is required. Please capture your current location again.";
    }

    return message;
  }

  if (typeof data?.error === "string") {
    return data.error;
  }

  return fallback;
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
 * Converts working minutes into readable format.
 */
function formatMinutes(minutes?: number | null) {
  if (!minutes || minutes <= 0) return "0 min";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Builds Google Maps link from latitude and longitude.
 */
function getMapUrl(
  latitude?: number | string | null,
  longitude?: number | string | null
) {
  if (latitude === null || latitude === undefined) return "";
  if (longitude === null || longitude === undefined) return "";

  return `https://www.google.com/maps?q=${Number(latitude)},${Number(
    longitude
  )}`;
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
 * First render loading UI prevents hydration mismatch.
 */
function ManagerAttendanceLoading() {
  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-48 rounded-[2rem] bg-white/10" />
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

function AttendanceInfoCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ElementType;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass = {
    default: "bg-amber-300/10 text-amber-300",
    success: "bg-emerald-300/10 text-emerald-300",
    warning: "bg-orange-300/10 text-orange-300",
    danger: "bg-red-300/10 text-red-300",
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

export default function ManagerAttendancePage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Do not read localStorage directly in initial state.
   * This prevents hydration mismatch.
   */
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPageReady, setIsPageReady] = useState(false);

  const [attendanceRecord, setAttendanceRecord] =
    useState<AttendanceRecord | null>(null);

  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocation | null>(null);

  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Client-side role protection.
   * Only MANAGER users can access this page.
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
        toast.error("Manager attendance page is only for manager users.");

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
   * Fetch manager today's attendance.
   */
  const fetchTodayAttendance = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const record = await getMyTodayAttendance();

      setAttendanceRecord(record);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "Failed to fetch today's attendance.")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load attendance data after manager session is ready.
   */
  useEffect(() => {
    if (!isPageReady || !user || user.role !== "MANAGER") return;

    let isMounted = true;

    const loadTodayAttendance = async () => {
      try {
        const record = await getMyTodayAttendance();

        if (isMounted) {
          setAttendanceRecord(record);
        }
      } catch (error: unknown) {
        if (isMounted) {
          toast.error(
            getApiErrorMessage(error, "Failed to fetch today's attendance.")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTodayAttendance();

    return () => {
      isMounted = false;
    };
  }, [isPageReady, user]);

  /**
   * Attach camera stream to video element whenever camera opens.
   */
  useEffect(() => {
    if (!isCameraOpen || !cameraStream || !videoRef.current) return;

    videoRef.current.srcObject = cameraStream;
  }, [isCameraOpen, cameraStream]);

  /**
   * Stop camera when page unmounts or stream changes.
   */
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  /**
   * Determines which attendance action is allowed.
   */
  const attendanceAction = useMemo(() => {
    if (!attendanceRecord) {
      return {
        label: "Check In",
        type: "CHECK_IN" as const,
        disabled: false,
      };
    }

    if (attendanceRecord.checkInAt && !attendanceRecord.checkOutAt) {
      return {
        label: "Check Out",
        type: "CHECK_OUT" as const,
        disabled: false,
      };
    }

    return {
      label: "Attendance Completed",
      type: "COMPLETED" as const,
      disabled: true,
    };
  }, [attendanceRecord]);

  /**
   * Get browser current location.
   * Manager can check-in/check-out from anywhere.
   */
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords;

        setCurrentLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? null,
        });

        setAddress(`${coords.latitude}, ${coords.longitude}`);

        toast.success("Current location captured successfully.");
        setIsGettingLocation(false);
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          toast.error(
            "Location permission denied. Please allow location access from browser settings."
          );
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          toast.error(
            "Current location is unavailable. Please check GPS/location service."
          );
        } else if (geoError.code === geoError.TIMEOUT) {
          toast.error("Location request timed out. Please try again.");
        } else {
          toast.error("Unable to get location. Please try again.");
        }

        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  /**
   * Upload photo manually.
   */
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB.");
      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(selectedFile);
    setPhotoPreview(URL.createObjectURL(selectedFile));
  };

  /**
   * Open browser camera.
   */
  const handleOpenCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
        audio: false,
      });

      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch {
      toast.error(
        "Camera access failed. Please allow camera permission or upload photo manually."
      );
    }
  };

  /**
   * Close camera and stop tracks.
   */
  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    setCameraStream(null);
    setIsCameraOpen(false);
  };

  /**
   * Capture photo from camera preview.
   */
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error("Camera preview not available.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      toast.error("Unable to capture photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Unable to capture photo. Please try again.");
          return;
        }

        const capturedFile = new File([blob], "attendance-photo.jpg", {
          type: "image/jpeg",
        });

        if (photoPreview) {
          URL.revokeObjectURL(photoPreview);
        }

        setPhoto(capturedFile);
        setPhotoPreview(URL.createObjectURL(capturedFile));
        handleCloseCamera();

        toast.success("Photo captured successfully.");
      },
      "image/jpeg",
      0.9
    );
  };

  /**
   * Remove selected/captured photo.
   */
  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(null);
    setPhotoPreview("");
  };

  /**
   * Submit check-in/check-out.
   */
  const handleSubmitAttendance = async () => {
    if (attendanceAction.disabled) {
      toast.info("Attendance already completed for today.");
      return;
    }

    if (!currentLocation) {
      toast.error("Please capture current location first.");
      return;
    }

    if (!photo) {
      toast.error("Please upload or capture photo proof.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        address: address || null,
        photo,
      };

      let updatedRecord: AttendanceRecord;

      if (attendanceAction.type === "CHECK_IN") {
        updatedRecord = await checkInAttendance(payload);
        toast.success("Checked in successfully.");
      } else {
        updatedRecord = await checkOutAttendance(payload);
        toast.success("Checked out successfully.");
      }

      setAttendanceRecord(updatedRecord);

      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }

      setPhoto(null);
      setPhotoPreview("");
      setCurrentLocation(null);
      setAddress("");
    } catch (error: unknown) {
      const fallbackMessage =
        attendanceAction.type === "CHECK_IN"
          ? "Failed to check in. Please try again."
          : "Failed to check out. Please try again.";

      toast.error(getApiErrorMessage(error, fallbackMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Logout manager.
   */
  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  const checkInMapUrl = getMapUrl(
    attendanceRecord?.checkInLatitude,
    attendanceRecord?.checkInLongitude
  );

  const checkOutMapUrl = getMapUrl(
    attendanceRecord?.checkOutLatitude,
    attendanceRecord?.checkOutLongitude
  );

  /**
   * First render will always show loading UI.
   * This fixes hydration mismatch.
   */
  if (!isPageReady || !user || user.role !== "MANAGER" || isLoading) {
    return <ManagerAttendanceLoading />;
  }

  return (
    <main className="min-h-screen bg-[#0d0906] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        {/* Premium header */}
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
                Manager Attendance
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                My Check-in / Check-out
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                Mark your own attendance with current location and photo proof.
                Location restriction is not applied; actual location is saved
                for Admin/HR verification.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => router.push("/manager/dashboard")}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>

              <Button
                onClick={() => router.push("/manager/attendance/history")}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
              >
                <Clock3 className="mr-2 h-4 w-4" />
                History
              </Button>

              <Button
                onClick={() => fetchTodayAttendance(true)}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
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

        {/* Info cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AttendanceInfoCard
            label="Today Status"
            value={
              attendanceRecord?.status
                ? attendanceRecord.status.replaceAll("_", " ")
                : "Not Marked"
            }
            description="Current attendance status for today."
            icon={CalendarCheck}
            tone={attendanceRecord ? "success" : "warning"}
          />

          <AttendanceInfoCard
            label="Check In"
            value={formatDateTime(attendanceRecord?.checkInAt)}
            description="Today's check-in time."
            icon={Clock3}
            tone="info"
          />

          <AttendanceInfoCard
            label="Check Out"
            value={formatDateTime(attendanceRecord?.checkOutAt)}
            description="Today's check-out time."
            icon={Timer}
            tone="default"
          />

          <AttendanceInfoCard
            label="Work Time"
            value={formatMinutes(attendanceRecord?.workingMinutes)}
            description="Total calculated working time."
            icon={CheckCircle2}
            tone="success"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {/* Attendance action card */}
          <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                    <LocateFixed className="h-3.5 w-3.5" />
                    Attendance Action
                  </div>

                  <h2 className="text-2xl font-black text-white">
                    {attendanceAction.label}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Capture your location and upload/capture a photo before
                    submitting attendance.
                  </p>
                </div>

                <Badge
                  className={getAttendanceStatusBadgeClass(
                    attendanceRecord?.status
                  )}
                >
                  {attendanceRecord?.status?.replaceAll("_", " ") ||
                    "NOT MARKED"}
                </Badge>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Location card */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300">
                      <MapPin className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-black text-white">
                        Current Location
                      </h3>
                      <p className="text-xs text-white/45">
                        Required for attendance proof.
                      </p>
                    </div>
                  </div>

                  {currentLocation ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
                        <p className="font-bold">Location captured</p>
                        <p className="mt-1 text-xs leading-5 text-emerald-100/75">
                          Lat: {currentLocation.latitude.toFixed(6)}
                          <br />
                          Long: {currentLocation.longitude.toFixed(6)}
                          <br />
                          Accuracy:{" "}
                          {currentLocation.accuracy
                            ? `${Math.round(currentLocation.accuracy)}m`
                            : "—"}
                        </p>
                      </div>

                      <textarea
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder="Address / location note"
                        className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-amber-300/30"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-white/50">
                      Location not captured yet. Click the button below to get
                      your current GPS location.
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation || attendanceAction.disabled}
                    className="mt-4 h-11 w-full rounded-xl bg-emerald-400 font-black text-black hover:bg-emerald-300 disabled:opacity-60"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <LocateFixed className="mr-2 h-4 w-4" />
                        Capture Location
                      </>
                    )}
                  </Button>
                </div>

                {/* Photo card */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                      <Camera className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-black text-white">Photo Proof</h3>
                      <p className="text-xs text-white/45">
                        Upload or capture live photo.
                      </p>
                    </div>
                  </div>

                  {photoPreview ? (
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Attendance proof preview"
                        className="h-64 w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 text-white shadow-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] text-center">
                      <div>
                        <Camera className="mx-auto h-8 w-8 text-amber-300" />
                        <p className="mt-3 text-sm font-bold text-white">
                          No photo selected
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          Upload image or open camera.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 text-sm font-bold text-amber-100 hover:bg-amber-300/20">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        disabled={attendanceAction.disabled}
                      />
                    </label>

                    <Button
                      type="button"
                      onClick={handleOpenCamera}
                      disabled={attendanceAction.disabled}
                      variant="outline"
                      className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-60"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Open Camera
                    </Button>
                  </div>
                </div>
              </div>

              {isCameraOpen ? (
                <div className="mt-6 rounded-3xl border border-amber-300/20 bg-black/30 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-black text-white">Camera Preview</h3>

                    <Button
                      type="button"
                      onClick={handleCloseCamera}
                      variant="outline"
                      className="h-9 rounded-xl border-red-300/20 bg-red-300/10 px-3 text-red-100 hover:bg-red-300/20"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Close
                    </Button>
                  </div>

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="max-h-[420px] w-full rounded-2xl bg-black object-cover"
                  />

                  <canvas ref={canvasRef} className="hidden" />

                  <Button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="mt-4 h-11 w-full rounded-xl bg-amber-400 font-black text-black hover:bg-amber-300"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capture Photo
                  </Button>
                </div>
              ) : null}

              <Button
                type="button"
                onClick={handleSubmitAttendance}
                disabled={
                  isSubmitting ||
                  attendanceAction.disabled ||
                  !currentLocation ||
                  !photo
                }
                className="mt-6 h-12 w-full rounded-xl bg-amber-400 text-base font-black text-black hover:bg-amber-300 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CalendarCheck className="mr-2 h-5 w-5" />
                    {attendanceAction.label}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Today's record */}
          <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-white">
                    Today's Record
                  </h2>
                  <p className="text-sm text-white/50">
                    Current manager attendance status.
                  </p>
                </div>
              </div>

              {attendanceRecord ? (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/40">
                      Status
                    </p>

                    <Badge
                      className={`mt-2 ${getAttendanceStatusBadgeClass(
                        attendanceRecord.status
                      )}`}
                    >
                      {attendanceRecord.status?.replaceAll("_", " ")}
                    </Badge>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-white/40">
                        Check In
                      </p>
                      <p className="mt-2 font-bold text-white">
                        {formatDateTime(attendanceRecord.checkInAt)}
                      </p>

                      {checkInMapUrl ? (
                        <a
                          href={checkInMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-bold text-emerald-100 hover:bg-emerald-300/20"
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          In Map
                          <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-white/40">
                        Check Out
                      </p>
                      <p className="mt-2 font-bold text-white">
                        {formatDateTime(attendanceRecord.checkOutAt)}
                      </p>

                      {checkOutMapUrl ? (
                        <a
                          href={checkOutMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-bold text-emerald-100 hover:bg-emerald-300/20"
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          Out Map
                          <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-white/40">
                        Working Details
                      </p>

                      <p className="mt-2 font-bold text-white">
                        Working: {formatMinutes(attendanceRecord.workingMinutes)}
                      </p>

                      <p className="mt-1 text-sm text-white/50">
                        Late: {formatMinutes(attendanceRecord.lateMinutes)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {attendanceRecord.checkInPhoto?.fileUrl ? (
                      <a
                        href={attendanceRecord.checkInPhoto.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 text-sm font-bold text-amber-100 hover:bg-amber-300/20"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        In Photo
                      </a>
                    ) : null}

                    {attendanceRecord.checkOutPhoto?.fileUrl ? (
                      <a
                        href={attendanceRecord.checkOutPhoto.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 text-sm font-bold text-amber-100 hover:bg-amber-300/20"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Out Photo
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-center">
                  <CalendarCheck className="mx-auto h-10 w-10 text-amber-300" />
                  <h3 className="mt-4 text-lg font-black text-white">
                    Attendance not marked
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Capture location and photo proof, then submit check-in.
                  </p>
                </div>
              )}
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
                  Anywhere Attendance Enabled
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Manager attendance can be marked from anywhere. The system
                  saves actual GPS location and photo proof for Admin/HR
                  verification, but does not block attendance based on office
                  radius.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              onClick={() => router.push("/manager/dashboard")}
              className="h-11 rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>

            <Button
              onClick={() => router.push("/manager/team-attendance")}
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <UsersRound className="mr-2 h-4 w-4" />
              Team Attendance
            </Button>

            <Button
              onClick={() => router.push("/manager/team-tasks")}
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Team Tasks
            </Button>

            <Button
              onClick={() => router.push("/manager/attendance/history")}
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <Clock3 className="mr-2 h-4 w-4" />
              History
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}