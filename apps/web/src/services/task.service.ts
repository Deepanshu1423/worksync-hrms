import { api } from "./api.service";
import {
  CreateTaskPayload,
  DeleteTaskResponse,
  Task,
  TaskResponse,
  TasksResponse,
  UpdateTaskPayload,
  UpdateTaskStatusPayload,
} from "@/types/task.types";

/**
 * Fetches all tasks for Admin/Manager.
 *
 * Backend route:
 * GET /api/tasks
 */
export const getAllTasks = async (): Promise<Task[]> => {
  const response = await api.get<TasksResponse>("/tasks");

  return response.data.data.tasks;
};

/**
 * Creates a new task.
 *
 * Backend route:
 * POST /api/tasks
 */
export const createTask = async (
  payload: CreateTaskPayload
): Promise<Task> => {
  const response = await api.post<TaskResponse>("/tasks", payload);

  return response.data.data.task;
};

/**
 * Updates task details.
 *
 * Backend route:
 * PATCH /api/tasks/:id
 */
export const updateTask = async (
  taskId: string,
  payload: UpdateTaskPayload
): Promise<Task> => {
  const response = await api.patch<TaskResponse>(`/tasks/${taskId}`, payload);

  return response.data.data.task;
};

/**
 * Updates only task status.
 *
 * Backend route:
 * PATCH /api/tasks/:id/status
 */
export const updateTaskStatus = async (
  taskId: string,
  payload: UpdateTaskStatusPayload
): Promise<Task> => {
  const response = await api.patch<TaskResponse>(
    `/tasks/${taskId}/status`,
    payload
  );

  return response.data.data.task;
};

/**
 * Deletes task.
 *
 * Backend route:
 * DELETE /api/tasks/:id
 */
export const deleteTask = async (
  taskId: string
): Promise<DeleteTaskResponse> => {
  const response = await api.delete<DeleteTaskResponse>(`/tasks/${taskId}`);

  return response.data;
};