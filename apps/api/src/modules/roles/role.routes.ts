import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import { getAllRolesController } from "./role.controller";

const router = Router();

router.use(authenticateUser);
router.use(authorizeRoles("SUPER_ADMIN", "ADMIN"));

router.get("/", getAllRolesController);

export default router;