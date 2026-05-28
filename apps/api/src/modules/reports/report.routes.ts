import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import {
  getAttendanceReportController,
  getEmployeeReportController,
  getHireFireReportController,
  getTaskReportController,
} from "./report.controller";

const router = Router();

/**
 * All report routes are protected.
 */
router.use(authenticateUser);

/**
 * Reports are available for:
 * - SUPER_ADMIN
 * - ADMIN / HR
 *
 * Manager team reports can be added later separately.
 */
router.use(authorizeRoles("SUPER_ADMIN", "ADMIN"));

router.get("/attendance", getAttendanceReportController);
router.get("/tasks", getTaskReportController);
router.get("/employees", getEmployeeReportController);
router.get("/hire-fire", getHireFireReportController);

export default router;