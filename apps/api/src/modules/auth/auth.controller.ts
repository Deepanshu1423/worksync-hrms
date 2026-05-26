import { Request, Response } from "express";
import { loginSchema } from "./auth.validation";
import { loginUserService } from "./auth.service";

export const loginController = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const result = await loginUserService(validatedData);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Login failed",
    });
  }
};
export const getCurrentUserController = async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Current user fetched successfully",
    data: {
      user: req.user,
    },
  });
};