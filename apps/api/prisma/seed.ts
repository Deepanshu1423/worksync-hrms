import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const roles = [
    {
      name: "SUPER_ADMIN",
      description: "Full system access for platform owner",
    },
    {
      name: "ADMIN",
      description: "HR/Admin access for employee management and reports",
    },
    {
      name: "MANAGER",
      description: "Manager access for team attendance, tasks and reports",
    },
    {
      name: "EMPLOYEE",
      description: "Employee access for attendance, tasks and own history",
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  const departments = [
    {
      name: "Plant Operations",
      description:
        "Employee team responsible for daily solar plant operational coordination",
    },
    {
      name: "Operations & Maintenance",
      description:
        "Employee team responsible for preventive maintenance, field checks and technical issue resolution",
    },
    {
      name: "Project Engineering",
      description:
        "Employee team responsible for plant development support, engineering coordination and execution tasks",
    },
    {
      name: "Grid Coordination",
      description:
        "Employee team responsible for coordination with grid, substation and electrical teams",
    },
    {
      name: "Procurement",
      description:
        "Employee team responsible for purchasing solar plant materials, tools and service items",
    },
    {
      name: "Warehouse & Spares",
      description:
        "Employee team responsible for spare parts, tools, material movement and inventory support",
    },
    {
      name: "Finance",
      description:
        "Employee team responsible for internal finance, payroll support, invoices and expense records",
    },
    {
      name: "Human Resources",
      description:
        "Employee team responsible for hiring, onboarding, attendance and employee records",
    },
    {
      name: "Compliance",
      description:
        "Employee team responsible for documentation, statutory compliance and internal policy tracking",
    },
    {
      name: "Administration",
      description:
        "Employee team responsible for office administration, coordination and internal support",
    },
  ];

  for (const department of departments) {
    await prisma.department.upsert({
      where: { name: department.name },
      update: { description: department.description },
      create: department,
    });
  }

  const designations = [
    {
      name: "Plant Manager",
      description:
        "Manages plant staff, team coordination, task planning and employee performance",
    },
    {
      name: "O&M Engineer",
      description:
        "Handles maintenance planning, field issue tracking and technical team coordination",
    },
    {
      name: "Electrical Engineer",
      description:
        "Supports electrical maintenance, safety checks and technical documentation",
    },
    {
      name: "Field Technician",
      description:
        "Performs field visits, maintenance work and assigned technical tasks",
    },
    {
      name: "SCADA Operator",
      description:
        "Supports plant operation team with system observation and operational updates",
    },
    {
      name: "Project Engineer",
      description:
        "Coordinates engineering tasks, project documentation and site execution follow-ups",
    },
    {
      name: "Grid Coordination Executive",
      description:
        "Coordinates with internal teams and grid/substation stakeholders",
    },
    {
      name: "Procurement Executive",
      description:
        "Handles vendor coordination, purchase requests and procurement records",
    },
    {
      name: "Warehouse Coordinator",
      description:
        "Maintains spare inventory, issue records and material movement tracking",
    },
    {
      name: "Finance Executive",
      description:
        "Handles finance records, expense tracking and internal billing support",
    },
    {
      name: "HR Executive",
      description:
        "Handles employee onboarding, attendance records and HR documentation",
    },
    {
      name: "Compliance Officer",
      description:
        "Maintains compliance documentation, policy records and audit support",
    },
    {
      name: "Admin Executive",
      description:
        "Handles office coordination, employee support and administrative tasks",
    },
  ];

  for (const designation of designations) {
    await prisma.designation.upsert({
      where: { name: designation.name },
      update: { description: designation.description },
      create: designation,
    });
  }

  await prisma.officeLocation.upsert({
    where: {
      id: "00000000-0000-0000-0000-000000000001",
    },
    update: {
      name: "Solar Plant Head Office",
      address: "Noida, Uttar Pradesh",
      latitude: 28.6139,
      longitude: 77.209,
      allowedRadius: 200,
      isActive: true,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Solar Plant Head Office",
      address: "Noida, Uttar Pradesh",
      latitude: 28.6139,
      longitude: 77.209,
      allowedRadius: 200,
      isActive: true,
    },
  });

  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
  });

  if (!superAdminRole) {
    throw new Error("SUPER_ADMIN role not found");
  }

  const passwordHash = await bcrypt.hash("Admin@123", 10);

  await prisma.user.upsert({
    where: { email: "admin@worksync.com" },
    update: {
      employeeCode: "SPP-ADMIN-001",
      fullName: "Solar Power Company Super Admin",
      passwordHash,
      status: UserStatus.ACTIVE,
      roleId: superAdminRole.id,
    },
    create: {
      employeeCode: "SPP-ADMIN-001",
      fullName: "Solar Power Company Super Admin",
      email: "admin@worksync.com",
      mobile: "9999999999",
      passwordHash,
      status: UserStatus.ACTIVE,
      roleId: superAdminRole.id,
      dateOfJoining: new Date(),
    },
  });

  console.log("Solar power company HRMS seed completed successfully");
  console.log("Admin Email: admin@worksync.com");
  console.log("Admin Password: Admin@123");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });