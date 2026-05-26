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
 * Checks whether Cloudinary credentials are available.
 * This gives a clear error instead of a confusing upload failure.
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
 * Uploads a buffer file to Cloudinary.
 * Multer memoryStorage gives file.buffer, and we stream it to Cloudinary.
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
        resource_type: "image",
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
 * Uploads file to Cloudinary and then saves metadata in file_assets table.
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