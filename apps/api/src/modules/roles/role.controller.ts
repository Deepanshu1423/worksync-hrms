import { Request, Response } from "express";
import { getAllRolesService } from "./role.service";

export const getAllRolesController = async (req: Request, res: Response) => {
  try {
    const roles = await getAllRolesService();

    return res.status(200).json({
      success: true,
      message: "Roles fetched successfully",
      data: {
        roles,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch roles",
    });
  }
};