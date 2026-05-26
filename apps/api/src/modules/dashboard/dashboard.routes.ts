import { Router } from "express";
import { getAdminDashboardController } from "./dashboard.controller";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

const router = Router();

router.get(
  "/admin",
  authenticateUser,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getAdminDashboardController
);

export default router;