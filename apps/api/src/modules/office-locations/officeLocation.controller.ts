import { Request, Response } from "express";
import {
  createOfficeLocationSchema,
  officeLocationIdSchema,
  updateOfficeLocationSchema,
  updateOfficeLocationStatusSchema,
} from "./officeLocation.validation";
import {
  createOfficeLocationService,
  deleteOfficeLocationService,
  getAllOfficeLocationsService,
  updateOfficeLocationService,
  updateOfficeLocationStatusService,
} from "./officeLocation.service";

/**
 * Create office location.
 *
 * POST /api/office-locations
 */
export const createOfficeLocationController = async (
  req: Request,
  res: Response
) => {
  try {
    /**
     * Validation file schema is flat,
     * so we directly parse req.body.
     */
    const validatedData = createOfficeLocationSchema.parse(req.body);

    const officeLocation = await createOfficeLocationService(validatedData);

    return res.status(201).json({
      success: true,
      message: "Office location created successfully",
      data: {
        officeLocation,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to create office location",
    });
  }
};

/**
 * Get all office locations.
 *
 * GET /api/office-locations
 */
export const getAllOfficeLocationsController = async (
  req: Request,
  res: Response
) => {
  try {
    const officeLocations = await getAllOfficeLocationsService();

    return res.status(200).json({
      success: true,
      message: "Office locations fetched successfully",
      data: {
        officeLocations,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch office locations",
    });
  }
};

/**
 * Update office location.
 *
 * PATCH /api/office-locations/:id
 */
export const updateOfficeLocationController = async (
  req: Request,
  res: Response
) => {
  try {
    /**
     * req.params contains:
     * { id: "..." }
     */
    const { id } = officeLocationIdSchema.parse(req.params);

    /**
     * req.body contains editable fields.
     */
    const validatedData = updateOfficeLocationSchema.parse(req.body);

    const officeLocation = await updateOfficeLocationService(id, validatedData);

    return res.status(200).json({
      success: true,
      message: "Office location updated successfully",
      data: {
        officeLocation,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to update office location",
    });
  }
};

/**
 * Activate / deactivate office location.
 *
 * PATCH /api/office-locations/:id/status
 */
export const updateOfficeLocationStatusController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = officeLocationIdSchema.parse(req.params);

    const validatedData = updateOfficeLocationStatusSchema.parse(req.body);

    const officeLocation = await updateOfficeLocationStatusService(
      id,
      validatedData
    );

    return res.status(200).json({
      success: true,
      message: "Office location status updated successfully",
      data: {
        officeLocation,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to update office location status",
    });
  }
};

/**
 * Delete office location.
 *
 * DELETE /api/office-locations/:id
 */
export const deleteOfficeLocationController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = officeLocationIdSchema.parse(req.params);

    const result = await deleteOfficeLocationService(id);

    return res.status(200).json({
      success: true,
      message: "Office location deleted successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to delete office location",
    });
  }
};