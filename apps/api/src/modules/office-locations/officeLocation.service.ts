import { prisma } from "../../database/prisma";
import {
  CreateOfficeLocationInput,
  UpdateOfficeLocationInput,
  UpdateOfficeLocationStatusInput,
} from "./officeLocation.validation";

export const createOfficeLocationService = async (
  data: CreateOfficeLocationInput
) => {
  const existingLocation = await prisma.officeLocation.findFirst({
    where: {
      name: data.name,
    },
  });

  if (existingLocation) {
    throw new Error("Office location already exists");
  }

  const officeLocation = await prisma.officeLocation.create({
    data: {
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      allowedRadius: data.allowedRadius || 200,
    },
  });

  return officeLocation;
};

export const getAllOfficeLocationsService = async () => {
  const officeLocations = await prisma.officeLocation.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      allowedRadius: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return officeLocations;
};

export const updateOfficeLocationService = async (
  id: string,
  data: UpdateOfficeLocationInput
) => {
  const officeLocation = await prisma.officeLocation.findUnique({
    where: {
      id,
    },
  });

  if (!officeLocation) {
    throw new Error("Office location not found");
  }

  if (data.name) {
    const duplicateLocation = await prisma.officeLocation.findFirst({
      where: {
        name: data.name,
        NOT: {
          id,
        },
      },
    });

    if (duplicateLocation) {
      throw new Error("Another office location with this name already exists");
    }
  }

  const updatedOfficeLocation = await prisma.officeLocation.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      allowedRadius: data.allowedRadius,
    },
  });

  return updatedOfficeLocation;
};

export const updateOfficeLocationStatusService = async (
  id: string,
  data: UpdateOfficeLocationStatusInput
) => {
  const officeLocation = await prisma.officeLocation.findUnique({
    where: {
      id,
    },
  });

  if (!officeLocation) {
    throw new Error("Office location not found");
  }

  const updatedOfficeLocation = await prisma.officeLocation.update({
    where: {
      id,
    },
    data: {
      isActive: data.isActive,
    },
  });

  return updatedOfficeLocation;
};

export const deleteOfficeLocationService = async (id: string) => {
  const officeLocation = await prisma.officeLocation.findUnique({
    where: {
      id,
    },
  });

  if (!officeLocation) {
    throw new Error("Office location not found");
  }

  await prisma.officeLocation.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
};