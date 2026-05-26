import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

/**
 * Multer memory storage
 * We are not saving files locally.
 * File will be stored in memory first, then uploaded to Cloudinary.
 */
const storage = multer.memoryStorage();

/**
 * Allowed image types for attendance selfie.
 */
const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * File filter to block invalid file types.
 */
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  if (!allowedImageTypes.includes(file.mimetype)) {
    return callback(
      new Error("Only JPG, JPEG, PNG and WEBP image files are allowed")
    );
  }

  callback(null, true);
};

/**
 * Upload middleware for single attendance photo.
 * Field name should be: photo
 */
export const uploadSingleAttendancePhoto = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size
  },
}).single("photo");