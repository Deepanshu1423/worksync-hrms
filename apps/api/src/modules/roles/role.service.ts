import { prisma } from "../../database/prisma";

export const getAllRolesService = async () => {
  const roles = await prisma.role.findMany({
    where: {
      name: {
        not: "SUPER_ADMIN",
      },
    },
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