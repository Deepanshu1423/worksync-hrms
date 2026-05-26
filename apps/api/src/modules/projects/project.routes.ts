import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import {
  createProjectController,
  deleteProjectController,
  getAllProjectsController,
  getProjectByIdController,
  updateProjectController,
} from "./project.controller";
import {
  addProjectMemberController,
  getProjectMembersController,
  removeProjectMemberController,
  updateProjectMemberController,
} from "./projectMember.controller";

const router = Router();

/**
 * All project routes are protected.
 */
router.use(authenticateUser);

/**
 * Admin/HR and Manager can manage internal work projects.
 *
 * Current access:
 * - SUPER_ADMIN
 * - ADMIN / HR
 * - MANAGER
 */
router.use(authorizeRoles("SUPER_ADMIN", "ADMIN", "MANAGER"));

/**
 * Project base routes.
 */
router.post("/", createProjectController);
router.get("/", getAllProjectsController);

/**
 * Project member routes.
 *
 * Important:
 * These routes must be placed before "/:id" route,
 * otherwise Express may treat "members" route as project id.
 */
router.post("/:projectId/members", addProjectMemberController);
router.get("/:projectId/members", getProjectMembersController);
router.patch("/:projectId/members/:memberId", updateProjectMemberController);
router.delete("/:projectId/members/:memberId", removeProjectMemberController);

/**
 * Single project routes.
 */
router.get("/:id", getProjectByIdController);
router.patch("/:id", updateProjectController);
router.delete("/:id", deleteProjectController);

export default router;