import { Readable } from "stream";
import { UploadApiResponse } from "cloudinary";
import cloudinary from "../../config/cloudinary.config";
import { prisma } from "../../database/prisma";

type CreateFileAssetInput = {
  file: Express.Multer.File;
  uploadedById: string;
  relatedType?: string;
  relatedId?: string;
  folder?: string;
};

/**
 * Checks Cloudinary credentials.
 *
 * This gives a clear error if .env credentials are missing.
 */
const ensureCloudinaryConfigured = () => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary credentials are not configured");
  }
};

/**
 * Uploads file buffer to Cloudinary.
 *
 * resource_type: "auto" allows images, PDFs and other document files.
 */
const uploadBufferToCloudinary = async (
  fileBuffer: Buffer,
  folder: string
): Promise<UploadApiResponse> => {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed"));
        }

        resolve(result);
      }
    );

    Readable.from(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Uploads file to Cloudinary and stores metadata in file_assets table.
 *
 * This is reusable for:
 * - attendance photos
 * - profile images
 * - task attachments
 * - project documents
 */
export const createFileAssetFromUpload = async ({
  file,
  uploadedById,
  relatedType,
  relatedId,
  folder = "worksync-hrms",
}: CreateFileAssetInput) => {
  const uploadResult = await uploadBufferToCloudinary(file.buffer, folder);

  const fileAsset = await prisma.fileAsset.create({
    data: {
      uploadedById,
      fileName: file.originalname,
      fileUrl: uploadResult.secure_url,
      fileType: file.mimetype,
      fileSize: file.size,
      publicId: uploadResult.public_id,
      relatedType: relatedType || null,
      relatedId: relatedId || null,
    },
  });

  return fileAsset;
};