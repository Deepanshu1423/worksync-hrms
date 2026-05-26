import { prisma } from "../../database/prisma";
import { CreateTaskCommentInput } from "./taskComment.validation";

/**
 * This helper checks whether the logged-in user can access this task.
 *
 * Rules:
 * - SUPER_ADMIN / ADMIN can access all tasks.
 * - MANAGER can access task if:
 *   1. Manager created the task
 *   2. Task is assigned to manager
 *   3. Task is assigned to manager's team member
 * - EMPLOYEE can access only their assigned task.
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
    const isManagerAllowed =
      task.createdById === currentUser.id ||
      task.assignedToId === currentUser.id ||
      task.assignedTo.managerId === currentUser.id;

    if (!isManagerAllowed) {
      throw new Error("You do not have permission to access this task");
    }

    return task;
  }

  if (task.assignedToId !== currentUser.id) {
    throw new Error("You can access only your assigned task");
  }

  return task;
};

/**
 * Add comment on task.
 *
 * Any allowed user can comment:
 * - Admin/HR
 * - Manager
 * - Assigned employee
 */
export const createTaskCommentService = async (
  taskId: string,
  data: CreateTaskCommentInput,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  await validateTaskAccess(taskId, currentUser);

  const taskComment = await prisma.taskComment.create({
    data: {
      taskId,
      userId: currentUser.id,
      comment: data.comment,
    },
    include: {
      user: {
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
          department: {
            select: {
              name: true,
            },
          },
          designation: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return taskComment;
};

/**
 * Get all comments of a task.
 *
 * First it validates task access, then returns comments.
 */
export const getTaskCommentsService = async (
  taskId: string,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  await validateTaskAccess(taskId, currentUser);

  const comments = await prisma.taskComment.findMany({
    where: {
      taskId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
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
          department: {
            select: {
              name: true,
            },
          },
          designation: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return comments;
};

/**
 * Delete task comment.
 *
 * Rules:
 * - SUPER_ADMIN / ADMIN can delete any comment.
 * - Comment owner can delete their own comment.
 * - Manager can delete comment if task was created by them.
 */
export const deleteTaskCommentService = async (
  taskId: string,
  commentId: string,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  const task = await validateTaskAccess(taskId, currentUser);

  const comment = await prisma.taskComment.findFirst({
    where: {
      id: commentId,
      taskId,
    },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(currentUser.role);
  const isCommentOwner = comment.userId === currentUser.id;
  const isTaskCreatorManager =
    currentUser.role === "MANAGER" && task.createdById === currentUser.id;

  if (!isAdmin && !isCommentOwner && !isTaskCreatorManager) {
    throw new Error("You do not have permission to delete this comment");
  }

  await prisma.taskComment.delete({
    where: {
      id: commentId,
    },
  });

  return {
    id: commentId,
  };
};