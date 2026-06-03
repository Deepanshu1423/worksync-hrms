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
 * This prevents raw Prisma/Zod/backend errors from showing in toast.
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

    if (firstKey === "latitude" || firstKey === "longitude") {
      return "Location is required. Please capture your current location again.";
    }

    if (firstKey === "photo") {
      return "Invalid photo. Please upload or capture a valid image.";
    }

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

    if (lowerMessage.includes("already checked in")) {
      return "You have already checked in today.";
    }

    if (lowerMessage.includes("already checked out")) {
      return "You have already checked out today.";
    }

    if (
      lowerMessage.includes("check in before checking out") ||
      lowerMessage.includes("please check in before checking out")
    ) {
      return "Please check in before checking out.";
    }

    if (
      lowerMessage.includes("outside the allowed office radius") ||
      lowerMessage.includes("allowed office radius")
    ) {
      return "Attendance is still blocked by office radius in backend. Please restart backend after removing radius validation.";
    }

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
function getMapUrl(latitude?: number | string | null, longitude?: number | string | null) {
  if (latitude === null || latitude === undefined) return "";
  if (longitude === null || longitude === undefined) return "";

  return `https://www.google.com/maps?q=${Number(latitude)},${Number(longitude)}`;
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
      <section className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-40 rounded-[2rem] bg-white/10" />
        <Skeleton className="h-80 rounded-[2rem] bg-white/10" />
      </section>
    </main>
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
   *
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
   * Fetch manager today's attendance manually.
   * Used by Refresh button also.
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
   *
   * Manager can check-in/check-out from anywhere.
   * We only store actual location for Admin/HR verification.
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
   * Select/upload photo proof from device.
   */
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    const maxSizeInMb = 5;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (selectedFile.size > maxSizeInBytes) {
      toast.error(`Photo size should be less than ${maxSizeInMb} MB.`);
      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    const previewUrl = URL.createObjectURL(selectedFile);

    setPhoto(selectedFile);
    setPhotoPreview(previewUrl);

    toast.success("Photo selected successfully.");
  };

  /**
   * Opens device camera.
   * Camera works on localhost and HTTPS.
   */
  const handleOpenCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera is not supported by this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
        audio: false,
      });

      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch {
      toast.error("Unable to open camera. Please allow camera permission.");
    }
  };

  /**
   * Stops camera stream.
   */
  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    setCameraStream(null);
    setIsCameraOpen(false);
  };

  /**
   * Captures current camera frame and converts it into File.
   * Same photo field is sent to backend during check-in/check-out.
   */
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error("Camera is not ready.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      toast.error("Unable to capture photo.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Unable to create photo file.");
          return;
        }

        if (photoPreview) {
          URL.revokeObjectURL(photoPreview);
        }

        const capturedFile = new File(
          [blob],
          `manager-attendance-photo-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        const previewUrl = URL.createObjectURL(blob);

        setPhoto(capturedFile);
        setPhotoPreview(previewUrl);

        toast.success("Photo captured successfully.");
        handleCloseCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  /**
   * Removes selected/captured photo.
   */
  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(null);
    setPhotoPreview("");
  };

  /**
   * Submit manager check-in or check-out.
   */
  const handleSubmitAttendance = async () => {
    if (!currentLocation) {
      toast.error("Please capture your current location first.");
      return;
    }

    if (attendanceAction.type === "COMPLETED") {
      toast.error("Today's attendance is already completed.");
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
                <CalendarCheck className="h-4 w-4" />
                Manager Attendance
              </p>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                My Check-in / Check-out
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
                Mark your own manager attendance with current location and photo
                proof. Location restriction is not applied.
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
                onClick={() => router.push("/manager/team-attendance")}
                variant="outline"
                className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
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
        </motion.div>

        {/* Manager + Today Status */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
            <CardContent className="p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                <UserRound className="h-5 w-5" />
              </div>

              <p className="text-sm text-white/55">Logged In As</p>
              <p className="mt-1 text-xl font-black text-white">
                {user.fullName || "Manager"}
              </p>
              <p className="mt-1 text-sm text-white/45">
                {user.employeeCode || user.role || "Manager"}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
            <CardContent className="p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300">
                <Clock3 className="h-5 w-5" />
              </div>

              <p className="text-sm text-white/55">Check In</p>
              <p className="mt-1 text-lg font-black text-white">
                {formatDateTime(attendanceRecord?.checkInAt)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
            <CardContent className="p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-300/10 text-orange-300">
                <Timer className="h-5 w-5" />
              </div>

              <p className="text-sm text-white/55">Check Out</p>
              <p className="mt-1 text-lg font-black text-white">
                {formatDateTime(attendanceRecord?.checkOutAt)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main action card */}
        <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Today&apos;s Attendance
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Capture location and photo first, then submit your attendance.
                </p>
              </div>

              <Badge
                className={getAttendanceStatusBadgeClass(
                  attendanceRecord?.status || "NOT_MARKED"
                )}
              >
                {attendanceRecord?.status
                  ? attendanceRecord.status.replaceAll("_", " ")
                  : "NOT MARKED"}
              </Badge>
            </div>

            <div className="grid gap-6 pt-6 lg:grid-cols-2">
              {/* Left: current location and photo */}
              <div className="space-y-4">
                {/* Current location */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                      <LocateFixed className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-bold text-white">Current Location</p>
                      <p className="text-xs text-white/45">
                        Required for check-in/check-out
                      </p>
                    </div>
                  </div>

                  {currentLocation ? (
                    <div className="space-y-2 text-sm text-white/65">
                      <p>
                        Latitude:{" "}
                        <span className="font-semibold text-white">
                          {currentLocation.latitude}
                        </span>
                      </p>
                      <p>
                        Longitude:{" "}
                        <span className="font-semibold text-white">
                          {currentLocation.longitude}
                        </span>
                      </p>
                      <p>
                        Accuracy:{" "}
                        <span className="font-semibold text-white">
                          {currentLocation.accuracy
                            ? `${Math.round(currentLocation.accuracy)}m`
                            : "—"}
                        </span>
                      </p>

                      <a
                        href={getMapUrl(
                          currentLocation.latitude,
                          currentLocation.longitude
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm font-bold text-amber-300 hover:text-amber-200"
                      >
                        Open Current Location
                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-white/45">
                      Location not captured yet.
                    </p>
                  )}

                  <Button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className="mt-5 w-full rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Capture Current Location
                      </>
                    )}
                  </Button>
                </div>

                {/* Photo proof */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                      <Camera className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-bold text-white">Photo Proof</p>
                      <p className="text-xs text-white/45">
                        Upload photo or capture using camera
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 text-sm font-bold text-amber-100 hover:bg-amber-300/20">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>

                    <Button
                      type="button"
                      onClick={handleOpenCamera}
                      className="h-11 rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Open Camera
                    </Button>
                  </div>

                  {photoPreview ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-2">
                        <p className="text-sm font-bold text-white">
                          Selected Photo
                        </p>

                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Manager attendance proof preview"
                        className="h-56 w-full object-cover"
                      />
                    </div>
                  ) : null}

                  {isCameraOpen ? (
                    <div className="mt-4 rounded-2xl border border-amber-300/20 bg-black/40 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-bold text-white">
                          Camera Preview
                        </p>

                        <button
                          type="button"
                          onClick={handleCloseCamera}
                          className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-64 w-full rounded-xl bg-black object-cover"
                      />

                      <canvas ref={canvasRef} className="hidden" />

                      <Button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="mt-4 h-11 w-full rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Capture Photo
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Right: attendance details */}
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-lg font-black text-white">
                    Attendance Details
                  </h3>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-sm text-white/40">Working Time</p>
                      <p className="mt-1 font-bold text-white">
                        {formatMinutes(attendanceRecord?.workingMinutes)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-white/40">Late Time</p>
                      <p className="mt-1 font-bold text-white">
                        {formatMinutes(attendanceRecord?.lateMinutes)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-white/40">
                        Check-in Location
                      </p>
                      {checkInMapUrl ? (
                        <a
                          href={checkInMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center font-bold text-amber-300 hover:text-amber-200"
                        >
                          Open Check-in Map
                          <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <p className="mt-1 text-white/55">—</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-white/40">
                        Check-out Location
                      </p>
                      {checkOutMapUrl ? (
                        <a
                          href={checkOutMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center font-bold text-amber-300 hover:text-amber-200"
                        >
                          Open Check-out Map
                          <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <p className="mt-1 text-white/55">—</p>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={attendanceAction.disabled || isSubmitting}
                  className="h-12 w-full rounded-xl bg-amber-400 text-base font-black text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    attendanceAction.label
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={() => fetchTodayAttendance(true)}
                  variant="outline"
                  className="h-11 w-full rounded-xl border-white/10 bg-white/5 font-bold text-white hover:bg-white/10"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh Today&apos;s Attendance
                </Button>

                <p className="text-center text-xs leading-5 text-white/40">
                  Location restriction is not applied. Your actual attendance
                  location and photo proof will be saved for Admin/HR
                  verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}