export type RoleOption = {
  id: string;
  name: string;
  description?: string | null;
  totalUsers?: number;
};

export type DepartmentOption = {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DesignationOption = {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RolesResponse = {
  success: boolean;
  message: string;
  data: {
    roles: RoleOption[];
  };
};

export type DepartmentsResponse = {
  success: boolean;
  message: string;
  data: {
    departments: DepartmentOption[];
  };
};

export type DepartmentResponse = {
  success: boolean;
  message: string;
  data: {
    department: DepartmentOption;
  };
};

export type DesignationsResponse = {
  success: boolean;
  message: string;
  data: {
    designations: DesignationOption[];
  };
};

export type DesignationResponse = {
  success: boolean;
  message: string;
  data: {
    designation: DesignationOption;
  };
};

export type CreateDepartmentPayload = {
  name: string;
  description?: string | null;
};

export type UpdateDepartmentPayload = {
  name?: string;
  description?: string | null;
};

export type DeleteDepartmentResponse = {
  success: boolean;
  message: string;
  data?: {
    id?: string;
  };
};

export type CreateDesignationPayload = {
  name: string;
  description?: string | null;
};

export type UpdateDesignationPayload = {
  name?: string;
  description?: string | null;
};

export type DeleteDesignationResponse = {
  success: boolean;
  message: string;
  data?: {
    id?: string;
  };
};