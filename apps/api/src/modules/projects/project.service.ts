import { prisma } from "../../database/prisma";
import {
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.validation";

/**
 * Converts optional date string into Date object.
 * If date is not provided, returns null/undefined based on usage.
 */
const parseOptionalDate = (dateValue?: string | null) => {
  if (!dateValue) {
    return null;
  }

  return new Date(dateValue);
};

/**
 * Create new project.
 *
 * This project module is used for internal employee work/task tracking.
 * Example:
 * - Monthly O&M Staff Task Plan
 * - Procurement Follow-up Work
 * - Plant Staff Compliance Documentation
 */
export const createProjectService = async (data: CreateProjectInput) => {
  const existingProject = await prisma.project.findFirst({
    where: {
      name: data.name,
    },
  });

  if (existingProject) {
    throw new Error("Project with this name already exists");
  }

  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description || null,
      startDate: parseOptionalDate(data.startDate),
      endDate: parseOptionalDate(data.endDate),
      status: data.status || "ACTIVE",
    },
  });

  return project;
};

/**
 * Fetch all projects with task/member count.
 * This helps dashboard and project listing UI.
 */
export const getAllProjectsService = async () => {
  const projects = await prisma.project.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          members: true,
          tasks: true,
        },
      },
    },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    totalMembers: project._count.members,
    totalTasks: project._count.tasks,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }));
};

/**
 * Fetch single project by id.
 */
export const getProjectByIdService = async (id: string) => {
  const project = await prisma.project.findUnique({
    where: {
      id,
    },
    include: {
      members: {
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
      },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          assignedTo: {
            select: {
              id: true,
              employeeCode: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
};

/**
 * Update project details.
 */
export const updateProjectService = async (
  id: string,
  data: UpdateProjectInput
) => {
  const project = await prisma.project.findUnique({
    where: {
      id,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (data.name) {
    const duplicateProject = await prisma.project.findFirst({
      where: {
        name: data.name,
        NOT: {
          id,
        },
      },
    });

    if (duplicateProject) {
      throw new Error("Another project with this name already exists");
    }
  }

  const updatedProject = await prisma.project.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      description: data.description,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      status: data.status,
    },
  });

  return updatedProject;
};

/**
 * Delete project safely.
 *
 * Rule:
 * If project has tasks or members, do not delete directly.
 * This prevents accidental loss of work history.
 */
export const deleteProjectService = async (id: string) => {
  const project = await prisma.project.findUnique({
    where: {
      id,
    },
    include: {
      _count: {
        select: {
          members: true,
          tasks: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (project._count.tasks > 0 || project._count.members > 0) {
    throw new Error(
      "Project cannot be deleted because it has assigned members or tasks"
    );
  }

  await prisma.project.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
};