import { Request, Response } from "express";
import {
  createTaskSchema,
  taskIdSchema,
  taskQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "./task.validation";
import {
  createTaskService,
  deleteTaskService,
  getAllTasksService,
  getMyTasksService,
  getTaskByIdService,
  updateTaskService,
  updateTaskStatusService,
} from "./task.service";

/**
 * Create task controller.
 */
export const createTaskController = async (req: Request, res: Response) => {
  try {
    const validatedData = createTaskSchema.parse(req.body);

    const task = await createTaskService(
      validatedData,
      req.user?.id as string
    );

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: {
        task,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to create task",
    });
  }
};

/**
 * Get all tasks controller.
 */
export const getAllTasksController = async (req: Request, res: Response) => {
  try {
    const validatedQuery = taskQuerySchema.parse(req.query);

    const tasks = await getAllTasksService(validatedQuery, {
      id: req.user?.id as string,
      role: req.user?.role as string,
    });

    return res.status(200).json({
      success: true,
      message: "Tasks fetched successfully",
      data: {
        tasks,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch tasks",
    });
  }
};

/**
 * Get logged-in user's assigned tasks.
 */
export const getMyTasksController = async (req: Request, res: Response) => {
  try {
    const tasks = await getMyTasksService(req.user?.id as string);

    return res.status(200).json({
      success: true,
      message: "My tasks fetched successfully",
      data: {
        tasks,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch my tasks",
    });
  }
};

/**
 * Get single task controller.
 */
export const getTaskByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = taskIdSchema.parse(req.params);

    const task = await getTaskByIdService(id, {
      id: req.user?.id as string,
      role: req.user?.role as string,
    });

    return res.status(200).json({
      success: true,
      message: "Task fetched successfully",
      data: {
        task,
      },
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      message: error?.message || "Failed to fetch task",
    });
  }
};

/**
 * Update task details controller.
 */
export const updateTaskController = async (req: Request, res: Response) => {
  try {
    const { id } = taskIdSchema.parse(req.params);
    const validatedData = updateTaskSchema.parse(req.body);

    const task = await updateTaskService(id, validatedData, {
      id: req.user?.id as string,
      role: req.user?.role as string,
    });

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: {
        task,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to update task",
    });
  }
};

/**
 * Update task status controller.
 */
export const updateTaskStatusController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = taskIdSchema.parse(req.params);
    const validatedData = updateTaskStatusSchema.parse(req.body);

    const task = await updateTaskStatusService(id, validatedData, {
      id: req.user?.id as string,
      role: req.user?.role as string,
    });

    return res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: {
        task,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to update task status",
    });
  }
};

/**
 * Delete task controller.
 */
export const deleteTaskController = async (req: Request, res: Response) => {
  try {
    const { id } = taskIdSchema.parse(req.params);

    const result = await deleteTaskService(id, {
      id: req.user?.id as string,
      role: req.user?.role as string,
    });

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to delete task",
    });
  }
};