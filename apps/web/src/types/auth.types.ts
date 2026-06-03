/**
 * Auth role type.
 * These roles are used for route protection and sidebar access.
 */
export type AuthRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "TEAM_MEMBER";

/**
 * Logged-in user stored in localStorage as worksync_user.
 */
export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  mobile?: string | null;
  role: AuthRole | string;
  employeeCode?: string | null;

  department?: {
    id?: string;
    name: string;
  } | null;

  designation?: {
    id?: string;
    name: string;
  } | null;
};

/**
 * Login request payload.
 */
export type LoginPayload = {
  email: string;
  password: string;
};

/**
 * Login API response.
 */
export type LoginResponse = {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    user: AuthUser;
  };
};

/**
 * Current logged-in user response.
 * Useful for protected /me or /auth APIs.
 */
export type CurrentUserResponse = {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
  };
};