import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import {
  createOfficeLocationController,
  deleteOfficeLocationController,
  getAllOfficeLocationsController,
  updateOfficeLocationController,
  updateOfficeLocationStatusController,
} from "./officeLocation.controller";

const router = Router();

router.use(authenticateUser);
router.use(authorizeRoles("SUPER_ADMIN", "ADMIN"));

router.post("/", createOfficeLocationController);
router.get("/", getAllOfficeLocationsController);
router.patch("/:id", updateOfficeLocationController);
router.patch("/:id/status", updateOfficeLocationStatusController);
router.delete("/:id", deleteOfficeLocationController);

export default router;