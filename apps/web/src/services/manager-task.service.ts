import { api } from "./api.service";

export type ManagerTeamTask = {
  id: string;
  title: string;
  description?: string | null;

  status: string;
  priority: string;

  dueDate?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  project?: {
    id?: string;
    name?: string;
  } | null;

  assignedTo?: {
    id?: string;
    employeeCode?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    department?: {
      id?: string;
      name?: string;
    } | null;
    designation?: {
      id?: string;
      name?: string;
    } | null;
  } | null;

  createdBy?: {
    id?: string;
    employeeCode?: string;
    fullName?: string;
  } | null;
};

type ManagerTasksResponse = {
  success: boolean;
  message: string;
  data?: {
    tasks?: ManagerTeamTask[];
    allTasks?: ManagerTeamTask[];
    taskList?: ManagerTeamTask[];
  };
};

/**
 * Fetch tasks visible to logged-in manager.
 *
 * Backend route:
 * GET /api/tasks
 *
 * Your backend route says:
 * MANAGER can view tasks based on manager scope.
 */
export const getManagerTeamTasks = async (): Promise<ManagerTeamTask[]> => {
  const response = await api.get<ManagerTasksResponse>("/tasks");

  return (
    response.data.data?.tasks ||
    response.data.data?.allTasks ||
    response.data.data?.taskList ||
    []
  );
};