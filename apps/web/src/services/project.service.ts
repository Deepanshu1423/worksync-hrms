import { api } from "./api.service";
import {
  CreateProjectPayload,
  DeleteProjectResponse,
  Project,
  ProjectResponse,
  ProjectsResponse,
  UpdateProjectPayload,
} from "@/types/project.types";

/**
 * Fetches all projects from backend.
 *
 * Backend route:
 * GET /api/projects
 */
export const getAllProjects = async (): Promise<Project[]> => {
  const response = await api.get<ProjectsResponse>("/projects");

  return response.data.data.projects;
};

/**
 * Creates a new project.
 *
 * Backend route:
 * POST /api/projects
 */
export const createProject = async (
  payload: CreateProjectPayload
): Promise<Project> => {
  const response = await api.post<ProjectResponse>("/projects", payload);

  return response.data.data.project;
};

/**
 * Updates project details.
 *
 * Backend route:
 * PATCH /api/projects/:id
 */
export const updateProject = async (
  projectId: string,
  payload: UpdateProjectPayload
): Promise<Project> => {
  const response = await api.patch<ProjectResponse>(
    `/projects/${projectId}`,
    payload
  );

  return response.data.data.project;
};

/**
 * Deletes a project.
 *
 * Backend route:
 * DELETE /api/projects/:id
 */
export const deleteProject = async (
  projectId: string
): Promise<DeleteProjectResponse> => {
  const response = await api.delete<DeleteProjectResponse>(
    `/projects/${projectId}`
  );

  return response.data;
};