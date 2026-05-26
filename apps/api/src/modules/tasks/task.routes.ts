import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import {
  createTaskController,
  deleteTaskController,
  getAllTasksController,
  getMyTasksController,
  getTaskByIdController,
  updateTaskController,
  updateTaskStatusController,
} from "./task.controller";
import {
  createTaskCommentController,
  deleteTaskCommentController,
  getTaskCommentsController,
} from "./taskComment.controller";

import { uploadSingleTaskAttachment } from "../../middleware/upload.middleware";
import {
  getTaskAttachmentsController,
  uploadTaskAttachmentController,
} from "./taskAttachment.controller";

const router = Router();

/**
 * All task routes are protected.
 * User must send valid JWT token in Authorization header.
 */
router.use(authenticateUser);

/**
 * Task attachment routes.
 *
 * These must also stay before "/:id" routes.
 */
router.post(
  "/:taskId/attachments",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  uploadSingleTaskAttachment,
  uploadTaskAttachmentController
);

router.get(
  "/:taskId/attachments",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  getTaskAttachmentsController
);

/**
 * Create task route.
 *
 * Access:
 * - SUPER_ADMIN
 * - ADMIN / HR
 * - MANAGER
 */
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "MANAGER"),
  createTaskController
);

/**
 * Get all tasks route.
 *
 * Access:
 * - SUPER_ADMIN / ADMIN can view all tasks.
 * - MANAGER can view tasks based on manager scope.
 */
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "MANAGER"),
  getAllTasksController
);

/**
 * Get logged-in user's assigned tasks.
 *
 * Access:
 * - EMPLOYEE
 * - MANAGER
 * - ADMIN
 * - SUPER_ADMIN
 */
router.get(
  "/my-tasks",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  getMyTasksController
);

/**
 * Task comments routes.
 *
 * Important:
 * These routes must be placed before "/:id" routes.
 * Otherwise Express can treat "comments" URLs as normal task id routes.
 */
router.post(
  "/:taskId/comments",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  createTaskCommentController
);

router.get(
  "/:taskId/comments",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  getTaskCommentsController
);

router.delete(
  "/:taskId/comments/:commentId",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  deleteTaskCommentController
);

/**
 * Get single task details.
 *
 * Access:
 * - User can view task only if allowed by service-level access rules.
 */
router.get(
  "/:id",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  getTaskByIdController
);

/**
 * Update task details.
 *
 * Access:
 * - SUPER_ADMIN
 * - ADMIN / HR
 * - MANAGER
 *
 * Employee cannot update full task details.
 * Employee can update only task status using /:id/status.
 */
router.patch(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "MANAGER"),
  updateTaskController
);

/**
 * Update task status.
 *
 * Access:
 * - EMPLOYEE can update own assigned task status.
 * - MANAGER can update allowed team/project tasks.
 * - ADMIN / SUPER_ADMIN can update allowed tasks.
 */
router.patch(
  "/:id/status",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"),
  updateTaskStatusController
);

/**
 * Delete task.
 *
 * Access:
 * - SUPER_ADMIN
 * - ADMIN / HR
 * - MANAGER
 *
 * Manager delete permission is controlled in service:
 * manager can delete only tasks created by themselves.
 */
router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "MANAGER"),
  deleteTaskController
);

export default router;