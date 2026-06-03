import { prisma } from "../../database/prisma";
import {
  CreateOfficeLocationInput,
  UpdateOfficeLocationInput,
  UpdateOfficeLocationStatusInput,
} from "./officeLocation.validation";

/**
 * Common response formatter.
 *
 * Backend DB field name is `allowedRadius`.
 * Frontend UI uses `radiusMeters`.
 *
 * So we return both:
 * - allowedRadius for backend consistency
 * - radiusMeters for frontend display
 */
const formatOfficeLocationResponse = (location: {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  allowedRadius: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => {
  return {
    ...location,
    radiusMeters: location.allowedRadius,
  };
};

/**
 * Create office location.
 *
 * Note:
 * This location is only reference data.
 * Employee attendance is NOT restricted based on this radius.
 */
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
      address: data.address || null,
      latitude: data.latitude,
      longitude: data.longitude,

      /**
       * If frontend does not send radius, use 200 meters as safe default.
       */
      allowedRadius: data.allowedRadius ?? 200,

      /**
       * New locations are active by default.
       */
      isActive: data.isActive ?? true,
    },
  });

  return formatOfficeLocationResponse(officeLocation);
};

/**
 * Get all office locations.
 */
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

  return officeLocations.map((location) =>
    formatOfficeLocationResponse(location)
  );
};

/**
 * Update office location.
 */
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

  /**
   * Check duplicate name only if name is being changed.
   */
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

  return formatOfficeLocationResponse(updatedOfficeLocation);
};

/**
 * Activate / deactivate office location.
 */
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

  return formatOfficeLocationResponse(updatedOfficeLocation);
};

/**
 * Delete office location.
 */
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