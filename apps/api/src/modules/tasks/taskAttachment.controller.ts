import { Request, Response } from "express";
import { taskAttachmentParamSchema } from "./taskAttachment.validation";
import {
  getTaskAttachmentsService,
  uploadTaskAttachmentService,
} from "./taskAttachment.service";

/**
 * Upload task attachment controller.
 */
export const uploadTaskAttachmentController = async (
  req: Request,
  res: Response
) => {
  try {
    const { taskId } = taskAttachmentParamSchema.parse(req.params);

    const attachment = await uploadTaskAttachmentService(taskId, req.file, {
      id: req.user?.id as string,
      role: req.user?.role as string,
    });

    return res.status(201).json({
      success: true,
      message: "Task attachment uploaded successfully",
      data: {
        attachment,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to upload task attachment",
    });
  }
};

/**
 * Get task attachments controller.
 */
export const getTaskAttachmentsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { taskId } = taskAttachmentParamSchema.parse(req.params);

    const attachments = await getTaskAttachmentsService(taskId, {
      id: req.user?.id as string,
      role: req.user?.role as string,
    });

    return res.status(200).json({
      success: true,
      message: "Task attachments fetched successfully",
      data: {
        attachments,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch task attachments",
    });
  }
};