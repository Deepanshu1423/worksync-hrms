import { prisma } from "../../database/prisma";
import { createFileAssetFromUpload } from "../files/fileUpload.service";

/**
 * Validates whether the logged-in user can access the selected task.
 *
 * Access rules:
 * - SUPER_ADMIN / ADMIN can access all tasks.
 * - MANAGER can access task if they created it or it belongs to their team.
 * - EMPLOYEE can access only assigned task.
 */
const validateTaskAccess = async (
  taskId: string,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          managerId: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (["SUPER_ADMIN", "ADMIN"].includes(currentUser.role)) {
    return task;
  }

  if (currentUser.role === "MANAGER") {
    const isAllowed =
      task.createdById === currentUser.id ||
      task.assignedToId === currentUser.id ||
      task.assignedTo.managerId === currentUser.id;

    if (!isAllowed) {
      throw new Error("You do not have permission to access this task");
    }

    return task;
  }

  if (task.assignedToId !== currentUser.id) {
    throw new Error("You can upload attachment only to your assigned task");
  }

  return task;
};

/**
 * Uploads task attachment.
 *
 * File will be uploaded to Cloudinary and metadata will be saved in file_assets table.
 */
export const uploadTaskAttachmentService = async (
  taskId: string,
  file: Express.Multer.File | undefined,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  await validateTaskAccess(taskId, currentUser);

  if (!file) {
    throw new Error("Attachment file is required");
  }

  const attachment = await createFileAssetFromUpload({
    file,
    uploadedById: currentUser.id,
    relatedType: "TASK_ATTACHMENT",
    relatedId: taskId,
    folder: "worksync-hrms/tasks/attachments",
  });

  return attachment;
};

/**
 * Returns task attachments.
 *
 * Frontend can use fileUrl to open/download the attachment.
 */
export const getTaskAttachmentsService = async (
  taskId: string,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  await validateTaskAccess(taskId, currentUser);

  const attachments = await prisma.fileAsset.findMany({
    where: {
      relatedType: "TASK_ATTACHMENT",
      relatedId: taskId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return attachments;
};