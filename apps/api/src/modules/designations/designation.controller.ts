import { Request, Response } from "express";
import {
  createDesignationSchema,
  designationIdSchema,
  updateDesignationSchema,
} from "./designation.validation";
import {
  createDesignationService,
  deleteDesignationService,
  getAllDesignationsService,
  updateDesignationService,
} from "./designation.service";

export const createDesignationController = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = createDesignationSchema.parse(req.body);

    const designation = await createDesignationService(validatedData);

    return res.status(201).json({
      success: true,
      message: "Designation created successfully",
      data: {
        designation,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to create designation",
    });
  }
};

export const getAllDesignationsController = async (
  req: Request,
  res: Response
) => {
  try {
    const designations = await getAllDesignationsService();

    return res.status(200).json({
      success: true,
      message: "Designations fetched successfully",
      data: {
        designations,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch designations",
    });
  }
};

export const updateDesignationController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = designationIdSchema.parse(req.params);
    const validatedData = updateDesignationSchema.parse(req.body);

    const designation = await updateDesignationService(id, validatedData);

    return res.status(200).json({
      success: true,
      message: "Designation updated successfully",
      data: {
        designation,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to update designation",
    });
  }
};

export const deleteDesignationController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = designationIdSchema.parse(req.params);

    const result = await deleteDesignationService(id);

    return res.status(200).json({
      success: true,
      message: "Designation deleted successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to delete designation",
    });
  }
};