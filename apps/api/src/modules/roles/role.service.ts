import { prisma } from "../../database/prisma";

/**
 * Fetch all system roles.
 *
 * Important:
 * SUPER_ADMIN ko bhi return kar rahe hain,
 * kyunki system me SUPER_ADMIN user exist karta hai
 * aur Roles page me all roles visible hone chahiye.
 */
export const getAllRolesService = async () => {
  const roles = await prisma.role.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    totalUsers: role._count.users,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }));
};