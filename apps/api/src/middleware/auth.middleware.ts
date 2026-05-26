import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../database/prisma";
import { UserStatus } from "../generated/prisma/client";

type AccessTokenPayload = JwtPayload & {
  userId: string;
  role: string;
};

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string
    ) as AccessTokenPayload;

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      include: {
        role: true,
      },
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: "User not found or deleted",
      });
    }

    if (user.status === UserStatus.TERMINATED || user.status === UserStatus.INACTIVE) {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    req.user = {
      id: user.id,
      role: user.role.name,
      email: user.email,
      status: user.status,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};