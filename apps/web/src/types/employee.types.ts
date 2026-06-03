/**
 * Employee status used in employee list and reports.
 */
export type EmployeeStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ON_NOTICE"
  | "TERMINATED";

/**
 * Employee role object.
 */
export type EmployeeRole = {
  id: string;
  name: string;
  description?: string | null;
};

/**
 * Employee department object.
 */
export type EmployeeDepartment = {
  id: string;
  name: string;
  description?: string | null;
} | null;

/**
 * Employee designation object.
 */
export type EmployeeDesignation = {
  id: string;
  name: string;
  description?: string | null;
} | null;

/**
 * Employee manager object.
 */
export type EmployeeManager = {
  id: string;
  employeeCode: string;
  fullName: string;
  email?: string;
} | null;

/**
 * Main Employee type used in Employees, Tasks, Reports and Attendance modules.
 */
export type Employee = {
  id: string;
  employeeCode: string;

  fullName: string;
  email: string;
  mobile: string;

  status: EmployeeStatus | string;

  dateOfJoining: string | null;
  terminatedAt?: string | null;
  terminationReason?: string | null;

  createdAt?: string;
  updatedAt?: string;

  role: EmployeeRole | null;
  department: EmployeeDepartment;
  designation: EmployeeDesignation;
  manager: EmployeeManager;
};

/**
 * GET /api/employees response.
 */
export type EmployeesResponse = {
  success: boolean;
  message: string;
  data: {
    employees: Employee[];
  };
};

/**
 * Single employee response.
 */
export type EmployeeResponse = {
  success: boolean;
  message: string;
  data: {
    employee: Employee;
  };
};

/**
 * Create employee request payload.
 */
export type CreateEmployeePayload = {
  fullName: string;
  email: string;
  mobile: string;
  password: string;

  roleId: string;
  departmentId?: string | null;
  designationId?: string | null;
  managerId?: string | null;

  dateOfJoining?: string | null;
};

/**
 * Create employee response.
 */
export type CreateEmployeeResponse = {
  success: boolean;
  message: string;
  data: {
    employee: Employee;
  };
};

/**
 * Update employee request payload.
 */
export type UpdateEmployeePayload = {
  fullName?: string;
  email?: string;
  mobile?: string;

  roleId?: string;
  departmentId?: string | null;
  designationId?: string | null;
  managerId?: string | null;

  dateOfJoining?: string | null;
};

/**
 * Update employee response.
 */
export type UpdateEmployeeResponse = {
  success: boolean;
  message: string;
  data: {
    employee: Employee;
  };
};

/**
 * Terminate employee request payload.
 */
export type TerminateEmployeePayload = {
  terminationReason: string;
};

/**
 * Terminate employee response.
 */
export type TerminateEmployeeResponse = {
  success: boolean;
  message: string;
  data: {
    employee: Employee;
  };
};