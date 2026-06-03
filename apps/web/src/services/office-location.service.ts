import { api } from "./api.service";
import {
  CreateOfficeLocationPayload,
  DeleteOfficeLocationResponse,
  OfficeLocation,
  OfficeLocationResponse,
  OfficeLocationsResponse,
  UpdateOfficeLocationPayload,
  UpdateOfficeLocationStatusPayload,
} from "@/types/office-location.types";

/**
 * Fetch all office / plant site locations.
 *
 * Backend route:
 * GET /api/office-locations
 */
export const getOfficeLocations = async (): Promise<OfficeLocation[]> => {
  const response = await api.get<OfficeLocationsResponse>("/office-locations");

  return response.data.data.officeLocations;
};

/**
 * Create a new office / plant site location.
 *
 * Backend expects:
 * allowedRadius
 *
 * Frontend form uses:
 * radiusMeters
 *
 * So we map radiusMeters -> allowedRadius here.
 */
export const createOfficeLocation = async (
  payload: CreateOfficeLocationPayload
): Promise<OfficeLocation> => {
  const response = await api.post<OfficeLocationResponse>(
    "/office-locations",
    {
      name: payload.name,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      allowedRadius: payload.radiusMeters,
      isActive: payload.isActive,
    }
  );

  return response.data.data.officeLocation;
};

/**
 * Update office / plant site location details.
 *
 * Backend expects:
 * allowedRadius
 *
 * Frontend form uses:
 * radiusMeters
 */
export const updateOfficeLocation = async (
  locationId: string,
  payload: UpdateOfficeLocationPayload
): Promise<OfficeLocation> => {
  const response = await api.patch<OfficeLocationResponse>(
    `/office-locations/${locationId}`,
    {
      name: payload.name,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      allowedRadius: payload.radiusMeters,
      isActive: payload.isActive,
    }
  );

  return response.data.data.officeLocation;
};

/**
 * Activate / deactivate office location.
 *
 * Backend route:
 * PATCH /api/office-locations/:id/status
 */
export const updateOfficeLocationStatus = async (
  locationId: string,
  payload: UpdateOfficeLocationStatusPayload
): Promise<OfficeLocation> => {
  const response = await api.patch<OfficeLocationResponse>(
    `/office-locations/${locationId}/status`,
    payload
  );

  return response.data.data.officeLocation;
};

/**
 * Delete office / plant site location.
 *
 * Backend route:
 * DELETE /api/office-locations/:id
 */
export const deleteOfficeLocation = async (
  locationId: string
): Promise<DeleteOfficeLocationResponse> => {
  const response = await api.delete<DeleteOfficeLocationResponse>(
    `/office-locations/${locationId}`
  );

  return response.data;
};