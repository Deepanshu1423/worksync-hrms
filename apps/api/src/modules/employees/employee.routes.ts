import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import {
  createEmployeeController,
  getAllEmployeesController,
  getEmployeeByIdController,
  softDeleteEmployeeController,
  terminateEmployeeController,
  updateEmployeeController,
} from "./employee.controller";

const router = Router();

router.use(authenticateUser);
router.use(authorizeRoles("SUPER_ADMIN", "ADMIN"));

router.post("/", createEmployeeController);
router.get("/", getAllEmployeesController);
router.get("/:id", getEmployeeByIdController);
router.patch("/:id", updateEmployeeController);
router.patch("/:id/terminate", terminateEmployeeController);
router.delete("/:id", softDeleteEmployeeController);

export default router;