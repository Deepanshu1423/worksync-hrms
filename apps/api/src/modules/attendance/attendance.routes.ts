import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import { uploadSingleAttendancePhoto } from "../../middleware/upload.middleware";
import {
  checkInController,
  checkOutController,
  getAdminAttendanceController,
  getMyAttendanceHistoryController,
  getMyTodayAttendanceController,
  getManagerTeamAttendanceController,
} from "./attendance.controller";

const router = Router();

router.use(authenticateUser);

/**
 * Logged-in user can view today's attendance.
 *
 * Frontend route:
 * GET /api/attendance/my-today
 *
 * Important:
 * Is route ko /:id type route se hamesha upar rakhna.
 */
router.get(
  "/my-today",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  getMyTodayAttendanceController
);

/**
 * Employee/Manager/Admin can mark their own attendance.
 *
 * Photo field name must be:
 * photo
 */
router.post(
  "/check-in",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  uploadSingleAttendancePhoto,
  checkInController
);

router.post(
  "/check-out",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  uploadSingleAttendancePhoto,
  checkOutController
);

/**
 * Logged-in user can view own attendance history.
 */
router.get(
  "/my-history",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  getMyAttendanceHistoryController
);

/**
 * Admin can view all attendance records.
 */
router.get(
  "/admin",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getAdminAttendanceController
);

/**
 * Manager can view only their team attendance.
 */
router.get(
  "/team",
  authorizeRoles("MANAGER"),
  getManagerTeamAttendanceController
);

export default router;