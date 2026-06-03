export type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED"
  | "CANCELLED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskProject = {
  id: string;
  name: string;
  status: string;
} | null;

export type TaskUser = {
  id: string;
  employeeCode: string;
  fullName: string;
  email?: string;
  role?: {
    name: string;
  };
  department?: {
    name: string;
  } | null;
  designation?: {
    name: string;
  } | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;

  projectId?: string | null;
  assignedToId: string;
  createdById: string;

  status: TaskStatus | string;
  priority: TaskPriority | string;

  dueDate: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;

  project: TaskProject;
  assignedTo: TaskUser;
  createdBy: TaskUser;

  _count?: {
    comments?: number;
  };
};

export type TasksResponse = {
  success: boolean;
  message: string;
  data: {
    tasks: Task[];
  };
};

export type TaskResponse = {
  success: boolean;
  message: string;
  data: {
    task: Task;
  };
};

export type CreateTaskPayload = {
  title: string;
  description?: string | null;
  projectId?: string | null;
  assignedToId: string;
  priority?: TaskPriority;
  dueDate?: string | null;
};

export type UpdateTaskPayload = {
  title?: string;
  description?: string | null;
  projectId?: string | null;
  assignedToId?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
};

export type UpdateTaskStatusPayload = {
  status: TaskStatus;
};

export type DeleteTaskResponse = {
  success: boolean;
  message: string;
  data?: {
    id?: string;
  };
};