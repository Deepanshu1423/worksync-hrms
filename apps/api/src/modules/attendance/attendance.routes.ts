import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import { uploadSingleAttendancePhoto } from "../../middleware/upload.middleware";
import {
  checkInController,
  checkOutController,
  getAdminAttendanceController,
  getMyAttendanceHistoryController,
  getManagerTeamAttendanceController,
} from "./attendance.controller";

const router = Router();

router.use(authenticateUser);

/**
 * Employee/Manager/Admin can mark their own attendance.
 * Photo is accepted with field name: photo
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
 * Admin/HR can view all attendance records.
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