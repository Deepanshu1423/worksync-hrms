import { api } from "./api.service";
import {
  CreateDepartmentPayload,
  CreateDesignationPayload,
  DeleteDepartmentResponse,
  DeleteDesignationResponse,
  DepartmentOption,
  DepartmentResponse,
  DepartmentsResponse,
  DesignationOption,
  DesignationResponse,
  DesignationsResponse,
  RoleOption,
  RolesResponse,
  UpdateDepartmentPayload,
  UpdateDesignationPayload,
} from "@/types/master-data.types";

/**
 * Fetch roles for dropdowns.
 *
 * Backend:
 * GET /api/roles
 */
export const getRoles = async (): Promise<RoleOption[]> => {
  const response = await api.get<RolesResponse>("/roles");

  return response.data.data.roles;
};

/**
 * Fetch departments for list/dropdowns.
 *
 * Backend:
 * GET /api/departments
 */
export const getDepartments = async (): Promise<DepartmentOption[]> => {
  const response = await api.get<DepartmentsResponse>("/departments");

  return response.data.data.departments;
};

/**
 * Creates a new department.
 *
 * Backend:
 * POST /api/departments
 */
export const createDepartment = async (
  payload: CreateDepartmentPayload
): Promise<DepartmentOption> => {
  const response = await api.post<DepartmentResponse>(
    "/departments",
    payload
  );

  return response.data.data.department;
};

/**
 * Updates an existing department.
 *
 * Backend:
 * PATCH /api/departments/:id
 */
export const updateDepartment = async (
  departmentId: string,
  payload: UpdateDepartmentPayload
): Promise<DepartmentOption> => {
  const response = await api.patch<DepartmentResponse>(
    `/departments/${departmentId}`,
    payload
  );

  return response.data.data.department;
};

/**
 * Deletes a department.
 *
 * Backend:
 * DELETE /api/departments/:id
 */
export const deleteDepartment = async (
  departmentId: string
): Promise<DeleteDepartmentResponse> => {
  const response = await api.delete<DeleteDepartmentResponse>(
    `/departments/${departmentId}`
  );

  return response.data;
};

/**
 * Fetch designations for list/dropdowns.
 *
 * Backend:
 * GET /api/designations
 */
export const getDesignations = async (): Promise<DesignationOption[]> => {
  const response = await api.get<DesignationsResponse>("/designations");

  return response.data.data.designations;
};

/**
 * Creates a new designation.
 *
 * Backend:
 * POST /api/designations
 */
export const createDesignation = async (
  payload: CreateDesignationPayload
): Promise<DesignationOption> => {
  const response = await api.post<DesignationResponse>(
    "/designations",
    payload
  );

  return response.data.data.designation;
};

/**
 * Updates an existing designation.
 *
 * Backend:
 * PATCH /api/designations/:id
 */
export const updateDesignation = async (
  designationId: string,
  payload: UpdateDesignationPayload
): Promise<DesignationOption> => {
  const response = await api.patch<DesignationResponse>(
    `/designations/${designationId}`,
    payload
  );

  return response.data.data.designation;
};

/**
 * Deletes a designation.
 *
 * Backend:
 * DELETE /api/designations/:id
 *
 * Backend may block delete if designation is already assigned to employees.
 */
export const deleteDesignation = async (
  designationId: string
): Promise<DeleteDesignationResponse> => {
  const response = await api.delete<DeleteDesignationResponse>(
    `/designations/${designationId}`
  );

  return response.data;
};