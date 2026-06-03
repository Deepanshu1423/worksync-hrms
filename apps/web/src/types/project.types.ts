export type ProjectStatus =
  | "PLANNED"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus | string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    members?: number;
    tasks?: number;
  };
};

export type ProjectsResponse = {
  success: boolean;
  message: string;
  data: {
    projects: Project[];
  };
};

export type ProjectResponse = {
  success: boolean;
  message: string;
  data: {
    project: Project;
  };
};

export type CreateProjectPayload = {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
};

export type UpdateProjectPayload = {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
};

export type DeleteProjectResponse = {
  success: boolean;
  message: string;
  data?: {
    id?: string;
  };
};