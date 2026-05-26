import bcrypt from "bcryptjs";
import { prisma } from "../../database/prisma";
import { UserStatus } from "../../generated/prisma/client";
import {
  CreateEmployeeInput,
  TerminateEmployeeInput,
  UpdateEmployeeInput,
} from "./employee.validation";

const getEmployeeCodePrefix = (roleName: string) => {
  if (roleName === "ADMIN") return "SPP-HR";
  if (roleName === "MANAGER") return "SPP-MGR";
  return "SPP-EMP";
};

const generateEmployeeCode = async (roleName: string) => {
  const prefix = getEmployeeCodePrefix(roleName);

  const lastUser = await prisma.user.findFirst({
    where: {
      employeeCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      employeeCode: true,
    },
  });

  let nextNumber = 1;

  if (lastUser?.employeeCode) {
    const lastNumber = Number(lastUser.employeeCode.split("-").pop());
    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
};

const validateRoleDepartmentDesignationManager = async (data: {
  roleId?: string;
  departmentId?: string | null;
  designationId?: string | null;
  managerId?: string | null;
}) => {
  let role = null;

  if (data.roleId) {
    role = await prisma.role.findUnique({
      where: { id: data.roleId },
    });

    if (!role) {
      throw new Error("Selected role does not exist");
    }

    if (role.name === "SUPER_ADMIN") {
      throw new Error("SUPER_ADMIN employee cannot be created from this module");
    }
  }

  if (data.departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
    });

    if (!department) {
      throw new Error("Selected department does not exist");
    }
  }

  if (data.designationId) {
    const designation = await prisma.designation.findUnique({
      where: { id: data.designationId },
    });

    if (!designation) {
      throw new Error("Selected designation does not exist");
    }
  }

  if (data.managerId) {
    const manager = await prisma.user.findFirst({
      where: {
        id: data.managerId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        role: {
          name: {
            in: ["ADMIN", "MANAGER"],
          },
        },
      },
      include: {
        role: true,
      },
    });

    if (!manager) {
      throw new Error("Selected manager does not exist or is not active");
    }
  }

  return role;
};

export const createEmployeeService = async (data: CreateEmployeeInput) => {
  const duplicateUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.email }, { mobile: data.mobile }],
    },
  });

  if (duplicateUser) {
    throw new Error("Employee with this email or mobile already exists");
  }

  const role = await validateRoleDepartmentDesignationManager({
    roleId: data.roleId,
    departmentId: data.departmentId,
    designationId: data.designationId,
    managerId: data.managerId,
  });

  if (!role) {
    throw new Error("Role is required");
  }

  const employeeCode = await generateEmployeeCode(role.name);
  const passwordHash = await bcrypt.hash(data.password, 10);

  const employee = await prisma.user.create({
    data: {
      employeeCode,
      fullName: data.fullName,
      email: data.email,
      mobile: data.mobile,
      passwordHash,
      roleId: data.roleId,
      departmentId: data.departmentId || null,
      designationId: data.designationId || null,
      managerId: data.managerId || null,
      dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : new Date(),
      status: UserStatus.ACTIVE,
    },
    include: {
      role: true,
      department: true,
      designation: true,
      manager: {
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
        },
      },
    },
  });

  return employee;
};

export const getAllEmployeesService = async () => {
  const employees = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: {
        name: {
          not: "SUPER_ADMIN",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      email: true,
      mobile: true,
      status: true,
      dateOfJoining: true,
      createdAt: true,
      role: {
        select: {
          id: true,
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
      manager: {
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
        },
      },
    },
  });

  return employees;
};

export const getEmployeeByIdService = async (id: string) => {
  const employee = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      email: true,
      mobile: true,
      status: true,
      dateOfJoining: true,
      terminatedAt: true,
      terminationReason: true,
      createdAt: true,
      updatedAt: true,
      role: true,
      department: true,
      designation: true,
      manager: {
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  return employee;
};

export const updateEmployeeService = async (
  id: string,
  data: UpdateEmployeeInput
) => {
  const employee = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  if (data.email || data.mobile) {
    const duplicateUser = await prisma.user.findFirst({
      where: {
        id: {
          not: id,
        },
        OR: [
          data.email ? { email: data.email } : undefined,
          data.mobile ? { mobile: data.mobile } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (duplicateUser) {
      throw new Error("Another employee with this email or mobile already exists");
    }
  }

  await validateRoleDepartmentDesignationManager({
    roleId: data.roleId,
    departmentId: data.departmentId,
    designationId: data.designationId,
    managerId: data.managerId,
  });

  const updatedEmployee = await prisma.user.update({
    where: {
      id,
    },
    data: {
      fullName: data.fullName,
      email: data.email,
      mobile: data.mobile,
      roleId: data.roleId,
      departmentId: data.departmentId,
      designationId: data.designationId,
      managerId: data.managerId,
      status: data.status,
      dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : undefined,
    },
    include: {
      role: true,
      department: true,
      designation: true,
      manager: {
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
        },
      },
    },
  });

  return updatedEmployee;
};

export const terminateEmployeeService = async (
  id: string,
  data: TerminateEmployeeInput,
  actionById: string
) => {
  const employee = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  if (employee.status === UserStatus.TERMINATED) {
    throw new Error("Employee is already terminated");
  }

  const terminatedEmployee = await prisma.user.update({
    where: {
      id,
    },
    data: {
      status: UserStatus.TERMINATED,
      terminatedAt: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
      terminationReason: data.terminationReason,
    },
  });

  await prisma.employeeStatusHistory.create({
    data: {
      employeeId: id,
      action: "TERMINATED",
      reason: data.terminationReason,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
      actionById,
    },
  });

  return terminatedEmployee;
};

export const softDeleteEmployeeService = async (id: string) => {
  const employee = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  await prisma.user.update({
    where: {
      id,
    },
    data: {
      status: UserStatus.INACTIVE,
      deletedAt: new Date(),
    },
  });

  return {
    id,
  };
};