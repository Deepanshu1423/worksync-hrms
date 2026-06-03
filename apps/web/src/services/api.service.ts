import axios from "axios";

/**
 * Central Axios instance for the frontend.
 * All backend API requests should use this instance.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: false,
});

/**
 * Request interceptor.
 * It automatically attaches JWT token from localStorage to every request.
 */
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("worksync_access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

/**
 * Response interceptor.
 * If backend returns unauthorized response, token is cleared.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      localStorage.removeItem("worksync_access_token");
      localStorage.removeItem("worksync_user");
    }

    return Promise.reject(error);
  }
);