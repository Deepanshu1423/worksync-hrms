import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import { getAdminDashboardController } from "./dashboard.controller";

const router = Router();

/**
 * Admin dashboard route.
 *
 * Access:
 * - SUPER_ADMIN
 * - ADMIN / HR
 */
router.get(
  "/admin",
  authenticateUser,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getAdminDashboardController
);

export default router;