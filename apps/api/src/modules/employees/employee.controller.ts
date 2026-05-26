import { Request, Response } from "express";
import {
  createEmployeeSchema,
  employeeIdSchema,
  terminateEmployeeSchema,
  updateEmployeeSchema,
} from "./employee.validation";
import {
  createEmployeeService,
  getAllEmployeesService,
  getEmployeeByIdService,
  softDeleteEmployeeService,
  terminateEmployeeService,
  updateEmployeeService,
} from "./employee.service";

export const createEmployeeController = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = createEmployeeSchema.parse(req.body);

    const employee = await createEmployeeService(validatedData);

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        employee,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to create employee",
    });
  }
};

export const getAllEmployeesController = async (
  req: Request,
  res: Response
) => {
  try {
    const employees = await getAllEmployeesService();

    return res.status(200).json({
      success: true,
      message: "Employees fetched successfully",
      data: {
        employees,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch employees",
    });
  }
};

export const getEmployeeByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = employeeIdSchema.parse(req.params);

    const employee = await getEmployeeByIdService(id);

    return res.status(200).json({
      success: true,
      message: "Employee fetched successfully",
      data: {
        employee,
      },
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      message: error?.message || "Failed to fetch employee",
    });
  }
};

export const updateEmployeeController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = employeeIdSchema.parse(req.params);
    const validatedData = updateEmployeeSchema.parse(req.body);

    const employee = await updateEmployeeService(id, validatedData);

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: {
        employee,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to update employee",
    });
  }
};

export const terminateEmployeeController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = employeeIdSchema.parse(req.params);
    const validatedData = terminateEmployeeSchema.parse(req.body);

    const employee = await terminateEmployeeService(
      id,
      validatedData,
      req.user?.id as string
    );

    return res.status(200).json({
      success: true,
      message: "Employee terminated successfully",
      data: {
        employee,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to terminate employee",
    });
  }
};

export const softDeleteEmployeeController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = employeeIdSchema.parse(req.params);

    const result = await softDeleteEmployeeService(id);

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to delete employee",
    });
  }
};