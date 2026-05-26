import { prisma } from "../../database/prisma";
import {
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "./department.validation";

export const createDepartmentService = async (
  data: CreateDepartmentInput
) => {
  const existingDepartment = await prisma.department.findUnique({
    where: {
      name: data.name,
    },
  });

  if (existingDepartment) {
    throw new Error("Department already exists");
  }

  const department = await prisma.department.create({
    data: {
      name: data.name,
      description: data.description || null,
    },
  });

  return department;
};

export const getAllDepartmentsService = async () => {
  const departments = await prisma.department.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  return departments.map((department) => ({
    id: department.id,
    name: department.name,
    description: department.description,
    totalEmployees: department._count.users,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
  }));
};

export const updateDepartmentService = async (
  id: string,
  data: UpdateDepartmentInput
) => {
  const department = await prisma.department.findUnique({
    where: {
      id,
    },
  });

  if (!department) {
    throw new Error("Department not found");
  }

  if (data.name) {
    const duplicateDepartment = await prisma.department.findFirst({
      where: {
        name: data.name,
        NOT: {
          id,
        },
      },
    });

    if (duplicateDepartment) {
      throw new Error("Another department with this name already exists");
    }
  }

  const updatedDepartment = await prisma.department.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      description: data.description,
    },
  });

  return updatedDepartment;
};

export const deleteDepartmentService = async (id: string) => {
  const department = await prisma.department.findUnique({
    where: {
      id,
    },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!department) {
    throw new Error("Department not found");
  }

  if (department._count.users > 0) {
    throw new Error(
      "Department cannot be deleted because employees are assigned to it"
    );
  }

  await prisma.department.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
};