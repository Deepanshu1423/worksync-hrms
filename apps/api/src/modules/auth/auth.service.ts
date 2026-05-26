import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../database/prisma";
import { UserStatus } from "../../generated/prisma/client";
import { LoginInput } from "./auth.validation";

export const loginUserService = async ({ identifier, password }: LoginInput) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { mobile: identifier }],
      deletedAt: null,
    },
    include: {
      role: true,
      department: true,
      designation: true,
    },
  });

  if (!user) {
    throw new Error("Invalid email/mobile or password");
  }

  if (user.status === UserStatus.TERMINATED) {
    throw new Error("Your account has been terminated. Please contact admin.");
  }

  if (user.status === UserStatus.INACTIVE) {
    throw new Error("Your account is inactive. Please contact admin.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error("Invalid email/mobile or password");
  }

  const accessToken = jwt.sign(
    {
      userId: user.id,
      role: user.role.name,
    },
    process.env.JWT_ACCESS_SECRET as string,
    {
      expiresIn: "1d",
    }
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
    },
  });

  return {
    accessToken,
    user: {
      id: user.id,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      status: user.status,
      role: user.role.name,
      department: user.department?.name || null,
      designation: user.designation?.name || null,
    },
  };
};