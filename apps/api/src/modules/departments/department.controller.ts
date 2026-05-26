import { Request, Response } from "express";
import {
  createDepartmentSchema,
  departmentIdSchema,
  updateDepartmentSchema,
} from "./department.validation";
import {
  createDepartmentService,
  deleteDepartmentService,
  getAllDepartmentsService,
  updateDepartmentService,
} from "./department.service";

export const createDepartmentController = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = createDepartmentSchema.parse(req.body);

    const department = await createDepartmentService(validatedData);

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: {
        department,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to create department",
    });
  }
};

export const getAllDepartmentsController = async (
  req: Request,
  res: Response
) => {
  try {
    const departments = await getAllDepartmentsService();

    return res.status(200).json({
      success: true,
      message: "Departments fetched successfully",
      data: {
        departments,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch departments",
    });
  }
};

export const updateDepartmentController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = departmentIdSchema.parse(req.params);
    const validatedData = updateDepartmentSchema.parse(req.body);

    const department = await updateDepartmentService(id, validatedData);

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: {
        department,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to update department",
    });
  }
};

export const deleteDepartmentController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = departmentIdSchema.parse(req.params);

    const result = await deleteDepartmentService(id);

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to delete department",
    });
  }
};