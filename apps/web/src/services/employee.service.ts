import { api } from "./api.service";
import {
  CreateEmployeePayload,
  CreateEmployeeResponse,
  Employee,
  EmployeesResponse,
  TerminateEmployeePayload,
  TerminateEmployeeResponse,
  UpdateEmployeePayload,
  UpdateEmployeeResponse,
} from "@/types/employee.types";

/**
 * Fetches all employees from backend.
 *
 * Backend route:
 * GET /api/employees
 */
export const getAllEmployees = async (): Promise<Employee[]> => {
  const response = await api.get<EmployeesResponse>("/employees");
  return response.data.data.employees;
};

/**
 * Creates a new employee.
 *
 * Backend route:
 * POST /api/employees
 */
export const createEmployee = async (
  payload: CreateEmployeePayload
): Promise<Employee> => {
  const response = await api.post<CreateEmployeeResponse>(
    "/employees",
    payload
  );

  return response.data.data.employee;
};

/**
 * Updates employee details.
 *
 * Backend route:
 * PATCH /api/employees/:id
 */
export const updateEmployee = async (
  employeeId: string,
  payload: UpdateEmployeePayload
): Promise<Employee> => {
  const response = await api.patch<UpdateEmployeeResponse>(
    `/employees/${employeeId}`,
    payload
  );

  return response.data.data.employee;
};

/**
 * Terminates an employee.
 *
 * Backend route:
 * PATCH /api/employees/:id/terminate
 */
export const terminateEmployee = async (
  employeeId: string,
  payload: TerminateEmployeePayload
): Promise<Employee> => {
  const response = await api.patch<TerminateEmployeeResponse>(
    `/employees/${employeeId}/terminate`,
    payload
  );

  return response.data.data.employee;
};