import { prisma } from "../../database/prisma";
import {
  TaskStatus,
  UserStatus,
} from "../../generated/prisma/client";
import {
  CreateTaskInput,
  TaskQueryInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "./task.validation";

/**
 * Common task include object.
 * This keeps task response consistent across create, update, list and detail APIs.
 */
const taskInclude = {
  project: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  assignedTo: {
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
  createdBy: {
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
  _count: {
    select: {
      comments: true,
    },
  },
};

/**
 * Converts optional date string into Date object.
 */
const parseOptionalDate = (dateValue?: string | null) => {
  if (!dateValue) {
    return null;
  }

  return new Date(dateValue);
};

/**
 * Validates selected project if projectId is provided.
 */
const validateProject = async (projectId?: string | null) => {
  if (!projectId) {
    return null;
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    throw new Error("Selected project does not exist");
  }

  if (project.status === "CANCELLED") {
    throw new Error("Task cannot be added to a cancelled project");
  }

  return project;
};

/**
 * Validates assigned employee.
 *
 * Rule:
 * - employee must exist
 * - employee must be active
 * - SUPER_ADMIN cannot be assigned normal tasks
 */
const validateAssignedEmployee = async (assignedToId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: assignedToId,
      deletedAt: null,
    },
    include: {
      role: true,
    },
  });

  if (!user) {
    throw new Error("Assigned employee not found");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new Error("Task can be assigned only to active employees");
  }

  if (user.role.name === "SUPER_ADMIN") {
    throw new Error("Task cannot be assigned to SUPER_ADMIN");
  }

  return user;
};

/**
 * If task is linked with a project, assigned employee should be a project member.
 * This keeps project task assignment clean and professional.
 */
const validateProjectMembership = async (
  projectId?: string | null,
  assignedToId?: string
) => {
  if (!projectId || !assignedToId) {
    return;
  }

  const projectMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: assignedToId,
      },
    },
  });

  if (!projectMember) {
    throw new Error(
      "Assigned employee must be added as project member before assigning project task"
    );
  }
};

/**
 * Create task service.
 *
 * Admin/Manager creates a task and assigns it to an employee.
 */
export const createTaskService = async (
  data: CreateTaskInput,
  createdById: string
) => {
  await validateProject(data.projectId);
  await validateAssignedEmployee(data.assignedToId);
  await validateProjectMembership(data.projectId, data.assignedToId);

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      projectId: data.projectId || null,
      assignedToId: data.assignedToId,
      createdById,
      priority: data.priority || "MEDIUM",
      dueDate: parseOptionalDate(data.dueDate),
      status: TaskStatus.PENDING,
    },
    include: taskInclude,
  });

  return task;
};

/**
 * Get all tasks service.
 *
 * Access behavior:
 * - SUPER_ADMIN / ADMIN: all tasks
 * - MANAGER: tasks created by manager OR assigned to manager's team members
 */
export const getAllTasksService = async (
  query: TaskQueryInput,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  const whereCondition: any = {};

  if (query.status) {
    whereCondition.status = query.status;
  }

  if (query.priority) {
    whereCondition.priority = query.priority;
  }

  if (query.projectId) {
    whereCondition.projectId = query.projectId;
  }

  if (query.assignedToId) {
    whereCondition.assignedToId = query.assignedToId;
  }

  /**
   * Manager should not see all company tasks.
   * Manager sees:
   * - tasks created by themselves
   * - tasks assigned to their team members
   */
  if (currentUser.role === "MANAGER") {
    whereCondition.OR = [
      {
        createdById: currentUser.id,
      },
      {
        assignedTo: {
          managerId: currentUser.id,
        },
      },
    ];
  }

  const tasks = await prisma.task.findMany({
    where: whereCondition,
    orderBy: {
      createdAt: "desc",
    },
    include: taskInclude,
  });

  return tasks;
};

/**
 * Returns logged-in user's assigned tasks.
 * Used in employee dashboard.
 */
export const getMyTasksService = async (userId: string) => {
  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: taskInclude,
  });

  return tasks;
};

/**
 * Checks whether current user can access a task.
 */
const canAccessTask = (task: any, currentUser: { id: string; role: string }) => {
  if (["SUPER_ADMIN", "ADMIN"].includes(currentUser.role)) {
    return true;
  }

  if (currentUser.role === "MANAGER") {
    return (
      task.createdById === currentUser.id ||
      task.assignedTo?.managerId === currentUser.id ||
      task.assignedToId === currentUser.id
    );
  }

  return task.assignedToId === currentUser.id;
};

/**
 * Get single task details.
 */
export const getTaskByIdService = async (
  id: string,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  const task = await prisma.task.findUnique({
    where: {
      id,
    },
    include: {
      ...taskInclude,
      assignedTo: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
          managerId: true,
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
      comments: {
        select: {
          id: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              employeeCode: true,
              fullName: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (!canAccessTask(task, currentUser)) {
    throw new Error("You do not have permission to view this task");
  }

  return task;
};

/**
 * Update task details.
 *
 * Only Admin/HR and Manager can update task details.
 * Employee can update only status using status API.
 */
export const updateTaskService = async (
  id: string,
  data: UpdateTaskInput,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  const existingTask = await prisma.task.findUnique({
    where: {
      id,
    },
    include: {
      assignedTo: true,
    },
  });

  if (!existingTask) {
    throw new Error("Task not found");
  }

  if (currentUser.role === "MANAGER") {
    const isManagerAllowed =
      existingTask.createdById === currentUser.id ||
      existingTask.assignedTo.managerId === currentUser.id;

    if (!isManagerAllowed) {
      throw new Error("You do not have permission to update this task");
    }
  }

  if (data.projectId !== undefined) {
    await validateProject(data.projectId);
  }

  if (data.assignedToId) {
    await validateAssignedEmployee(data.assignedToId);
    await validateProjectMembership(
      data.projectId !== undefined ? data.projectId : existingTask.projectId,
      data.assignedToId
    );
  }

  const updatedTask = await prisma.task.update({
    where: {
      id,
    },
    data: {
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      assignedToId: data.assignedToId,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: taskInclude,
  });

  return updatedTask;
};

/**
 * Update task status.
 *
 * Employee can update status only for their assigned task.
 * Manager/Admin can update status for allowed tasks.
 */
export const updateTaskStatusService = async (
  id: string,
  data: UpdateTaskStatusInput,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  const task = await prisma.task.findUnique({
    where: {
      id,
    },
    include: {
      assignedTo: true,
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  /**
   * Employee can update only their own task.
   */
  if (currentUser.role === "EMPLOYEE" && task.assignedToId !== currentUser.id) {
    throw new Error("You can update only your assigned task");
  }

  /**
   * Manager can update task if:
   * - task was created by manager
   * - task is assigned to manager's team member
   * - task is assigned to manager themselves
   */
  if (currentUser.role === "MANAGER") {
    const isManagerAllowed =
      task.createdById === currentUser.id ||
      task.assignedTo.managerId === currentUser.id ||
      task.assignedToId === currentUser.id;

    if (!isManagerAllowed) {
      throw new Error("You do not have permission to update this task status");
    }
  }

  /**
   * Completed time is saved only when status becomes COMPLETED.
   * If task is moved back from completed, completedAt is cleared.
   */
  const completedAt =
    data.status === TaskStatus.COMPLETED ? new Date() : null;

  const updatedTask = await prisma.task.update({
    where: {
      id,
    },
    data: {
      status: data.status,
      completedAt,
    },
    include: taskInclude,
  });

  return updatedTask;
};

/**
 * Delete task.
 *
 * Admin/HR can delete any task.
 * Manager can delete only task created by themselves.
 */
export const deleteTaskService = async (
  id: string,
  currentUser: {
    id: string;
    role: string;
  }
) => {
  const task = await prisma.task.findUnique({
    where: {
      id,
    },
    include: {
      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (currentUser.role === "MANAGER" && task.createdById !== currentUser.id) {
    throw new Error("Manager can delete only tasks created by themselves");
  }

  if (task._count.comments > 0) {
    throw new Error("Task cannot be deleted because it has comments");
  }

  await prisma.task.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
};