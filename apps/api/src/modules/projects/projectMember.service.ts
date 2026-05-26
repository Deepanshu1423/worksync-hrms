import { prisma } from "../../database/prisma";
import { UserStatus } from "../../generated/prisma/client";
import {
  AddProjectMemberInput,
  UpdateProjectMemberInput,
} from "./projectMember.validation";

/**
 * Checks whether project exists.
 */
const validateProjectExists = async (projectId: string) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
};

/**
 * Checks whether selected user is valid for project membership.
 *
 * Rule:
 * - Deleted users cannot be added.
 * - Terminated/inactive users cannot be added.
 * - SUPER_ADMIN should not be added as project member.
 */
const validateUserForProject = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    include: {
      role: true,
    },
  });

  if (!user) {
    throw new Error("Employee not found");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new Error("Only active employees can be added to project");
  }

  if (user.role.name === "SUPER_ADMIN") {
    throw new Error("SUPER_ADMIN cannot be added as project member");
  }

  return user;
};

/**
 * Add employee/manager/admin as project member.
 *
 * Example:
 * Project: O&M Team Weekly Work Plan
 * Member: Field Technician / O&M Engineer / Project Engineer
 */
export const addProjectMemberService = async (
  projectId: string,
  data: AddProjectMemberInput
) => {
  await validateProjectExists(projectId);
  await validateUserForProject(data.userId);

  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: data.userId,
      },
    },
  });

  if (existingMember) {
    throw new Error("Employee is already added to this project");
  }

  const projectMember = await prisma.projectMember.create({
    data: {
      projectId,
      userId: data.userId,
      role: data.role || "TEAM_MEMBER",
    },
    include: {
      user: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
          mobile: true,
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

  return projectMember;
};

/**
 * Get all members of a project.
 */
export const getProjectMembersService = async (projectId: string) => {
  await validateProjectExists(projectId);

  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
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
          mobile: true,
          status: true,
          role: {
            select: {
              name: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          designation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return members;
};

/**
 * Update project member responsibility role.
 *
 * This does not update user's system role.
 * It only updates project-level role.
 */
export const updateProjectMemberService = async (
  projectId: string,
  memberId: string,
  data: UpdateProjectMemberInput
) => {
  await validateProjectExists(projectId);

  const member = await prisma.projectMember.findFirst({
    where: {
      id: memberId,
      projectId,
    },
  });

  if (!member) {
    throw new Error("Project member not found");
  }

  const updatedMember = await prisma.projectMember.update({
    where: {
      id: memberId,
    },
    data: {
      role: data.role,
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

  return updatedMember;
};

/**
 * Remove employee from project.
 *
 * This does not delete employee.
 * It only removes employee from selected project.
 */
export const removeProjectMemberService = async (
  projectId: string,
  memberId: string
) => {
  await validateProjectExists(projectId);

  const member = await prisma.projectMember.findFirst({
    where: {
      id: memberId,
      projectId,
    },
  });

  if (!member) {
    throw new Error("Project member not found");
  }

  await prisma.projectMember.delete({
    where: {
      id: memberId,
    },
  });

  return {
    id: memberId,
  };
};