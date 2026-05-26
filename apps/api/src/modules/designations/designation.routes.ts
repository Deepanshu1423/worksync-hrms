import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import {
  createDesignationController,
  deleteDesignationController,
  getAllDesignationsController,
  updateDesignationController,
} from "./designation.controller";

const router = Router();

router.use(authenticateUser);
router.use(authorizeRoles("SUPER_ADMIN", "ADMIN"));

router.post("/", createDesignationController);
router.get("/", getAllDesignationsController);
router.patch("/:id", updateDesignationController);
router.delete("/:id", deleteDesignationController);

export default router;