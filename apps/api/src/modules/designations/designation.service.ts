import { prisma } from "../../database/prisma";
import {
  CreateDesignationInput,
  UpdateDesignationInput,
} from "./designation.validation";

export const createDesignationService = async (
  data: CreateDesignationInput
) => {
  const existingDesignation = await prisma.designation.findUnique({
    where: {
      name: data.name,
    },
  });

  if (existingDesignation) {
    throw new Error("Designation already exists");
  }

  const designation = await prisma.designation.create({
    data: {
      name: data.name,
      description: data.description || null,
    },
  });

  return designation;
};

export const getAllDesignationsService = async () => {
  const designations = await prisma.designation.findMany({
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

  return designations.map((designation) => ({
    id: designation.id,
    name: designation.name,
    description: designation.description,
    totalEmployees: designation._count.users,
    createdAt: designation.createdAt,
    updatedAt: designation.updatedAt,
  }));
};

export const updateDesignationService = async (
  id: string,
  data: UpdateDesignationInput
) => {
  const designation = await prisma.designation.findUnique({
    where: {
      id,
    },
  });

  if (!designation) {
    throw new Error("Designation not found");
  }

  if (data.name) {
    const duplicateDesignation = await prisma.designation.findFirst({
      where: {
        name: data.name,
        NOT: {
          id,
        },
      },
    });

    if (duplicateDesignation) {
      throw new Error("Another designation with this name already exists");
    }
  }

  const updatedDesignation = await prisma.designation.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      description: data.description,
    },
  });

  return updatedDesignation;
};

export const deleteDesignationService = async (id: string) => {
  const designation = await prisma.designation.findUnique({
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

  if (!designation) {
    throw new Error("Designation not found");
  }

  if (designation._count.users > 0) {
    throw new Error(
      "Designation cannot be deleted because employees are assigned to it"
    );
  }

  await prisma.designation.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
};