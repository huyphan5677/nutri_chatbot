import axiosInstance from "axios";

export const getApiUrl = () => {
  if (typeof window !== "undefined" && (window as any).ENV?.VITE_API_URL) {
    return (window as any).ENV.VITE_API_URL;
  }
  return import.meta.env.VITE_API_URL || "/api/v1";
};

export const api = axiosInstance.create({
  baseURL: getApiUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nutri_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
