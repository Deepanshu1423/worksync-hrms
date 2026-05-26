import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import {
  createDepartmentController,
  deleteDepartmentController,
  getAllDepartmentsController,
  updateDepartmentController,
} from "./department.controller";

const router = Router();

router.use(authenticateUser);
router.use(authorizeRoles("SUPER_ADMIN", "ADMIN"));

router.post("/", createDepartmentController);
router.get("/", getAllDepartmentsController);
router.patch("/:id", updateDepartmentController);
router.delete("/:id", deleteDepartmentController);

export default router;