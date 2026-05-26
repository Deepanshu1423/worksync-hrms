import { Request, Response } from "express";
import {
  createTaskCommentSchema,
  taskCommentParamSchema,
  taskCommentTaskParamSchema,
} from "./taskComment.validation";
import {
  createTaskCommentService,
  deleteTaskCommentService,
  getTaskCommentsService,
} from "./taskComment.service";

/**
 * Add task comment controller.
 */
export const createTaskCommentController = async (
  req: Request,
  res: Response
) => {
  try {
    const { taskId } = taskCommentTaskParamSchema.parse(req.params);
    const validatedData = createTaskCommentSchema.parse(req.body);

    const comment = await createTaskCommentService(taskId, validatedData, {
      id: req.user?.id as string,
      role: req.user?.role as string,
    });

    return res.status(201).json({
      success: true,
      message: "Task comment added successfully",
      data: {
        comment,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to add task comment",
    });
  }
};

/**
 * Get task comments controller.
 */
export const getTaskCommentsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { taskId } = taskCommentTaskParamSchema.parse(req.params);

    const comments = await getTaskCommentsService(taskId, {
      id: req.user?.id as string,
      role: req.user?.role as string,
    });

    return res.status(200).json({
      success: true,
      message: "Task comments fetched successfully",
      data: {
        comments,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch task comments",
    });
  }
};

/**
 * Delete task comment controller.
 */
export const deleteTaskCommentController = async (
  req: Request,
  res: Response
) => {
  try {
    const { taskId, commentId } = taskCommentParamSchema.parse(req.params);

    const result = await deleteTaskCommentService(taskId, commentId, {
      id: req.user?.id as string,
      role: req.user?.role as string,
    });

    return res.status(200).json({
      success: true,
      message: "Task comment deleted successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to delete task comment",
    });
  }
};