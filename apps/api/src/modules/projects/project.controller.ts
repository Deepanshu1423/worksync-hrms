import { Request, Response } from "express";
import {
  createProjectSchema,
  projectIdSchema,
  updateProjectSchema,
} from "./project.validation";
import {
  createProjectService,
  deleteProjectService,
  getAllProjectsService,
  getProjectByIdService,
  updateProjectService,
} from "./project.service";

/**
 * Create project controller.
 */
export const createProjectController = async (req: Request, res: Response) => {
  try {
    const validatedData = createProjectSchema.parse(req.body);

    const project = await createProjectService(validatedData);

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: {
        project,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to create project",
    });
  }
};

/**
 * Get all projects controller.
 */
export const getAllProjectsController = async (
  req: Request,
  res: Response
) => {
  try {
    const projects = await getAllProjectsService();

    return res.status(200).json({
      success: true,
      message: "Projects fetched successfully",
      data: {
        projects,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch projects",
    });
  }
};

/**
 * Get single project controller.
 */
export const getProjectByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = projectIdSchema.parse(req.params);

    const project = await getProjectByIdService(id);

    return res.status(200).json({
      success: true,
      message: "Project fetched successfully",
      data: {
        project,
      },
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      message: error?.message || "Failed to fetch project",
    });
  }
};

/**
 * Update project controller.
 */
export const updateProjectController = async (req: Request, res: Response) => {
  try {
    const { id } = projectIdSchema.parse(req.params);
    const validatedData = updateProjectSchema.parse(req.body);

    const project = await updateProjectService(id, validatedData);

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: {
        project,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to update project",
    });
  }
};

/**
 * Delete project controller.
 */
export const deleteProjectController = async (req: Request, res: Response) => {
  try {
    const { id } = projectIdSchema.parse(req.params);

    const result = await deleteProjectService(id);

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to delete project",
    });
  }
};