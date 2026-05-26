import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

/**
 * Multer memory storage.
 *
 * We are not saving uploaded files locally.
 * Files are temporarily kept in memory and then uploaded to Cloudinary.
 */
const storage = multer.memoryStorage();

/**
 * Allowed image types for attendance selfie.
 */
const allowedAttendanceImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/**
 * Allowed task attachment types.
 *
 * Task attachment supports images and common document files.
 */
const allowedTaskAttachmentTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/**
 * File filter for attendance photo upload.
 */
const attendanceImageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  if (!allowedAttendanceImageTypes.includes(file.mimetype)) {
    return callback(
      new Error("Only JPG, JPEG, PNG and WEBP image files are allowed")
    );
  }

  callback(null, true);
};

/**
 * File filter for task attachments.
 */
const taskAttachmentFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  if (!allowedTaskAttachmentTypes.includes(file.mimetype)) {
    return callback(
      new Error("Only image, PDF, DOC, DOCX, XLS and XLSX files are allowed")
    );
  }

  callback(null, true);
};

/**
 * Upload middleware for single attendance photo.
 *
 * Form-data field name must be:
 * photo
 */
export const uploadSingleAttendancePhoto = multer({
  storage,
  fileFilter: attendanceImageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
}).single("photo");

/**
 * Upload middleware for single task attachment.
 *
 * Form-data field name must be:
 * attachment
 */
export const uploadSingleTaskAttachment = multer({
  storage,
  fileFilter: taskAttachmentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
}).single("attachment");