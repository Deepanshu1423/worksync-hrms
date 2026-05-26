import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary configuration
 * This is used for uploading attendance photos, profile photos,
 * task attachments, and other production files.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;