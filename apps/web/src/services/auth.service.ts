import { api } from "./api.service";
import { LoginPayload, LoginResponse } from "@/types/auth.types";

/**
 * Login API call.
 * Backend route: POST /api/auth/login
 */
export const loginUser = async (payload: LoginPayload) => {
  const response = await api.post<LoginResponse>("/auth/login", payload);
  return response.data;
};

/**
 * Save login data in localStorage.
 */
export const saveAuthSession = (token: string, user: unknown) => {
  localStorage.setItem("worksync_access_token", token);
  localStorage.setItem("worksync_user", JSON.stringify(user));
};

/**
 * Clear login data from localStorage.
 */
export const clearAuthSession = () => {
  localStorage.removeItem("worksync_access_token");
  localStorage.removeItem("worksync_user");
};