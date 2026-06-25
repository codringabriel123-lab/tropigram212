import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("trp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthCheck = err.config?.url?.includes("/auth/me");
    if (err.response?.status === 401 && isAuthCheck) {
      localStorage.removeItem("trp_token");
      localStorage.removeItem("trp_user");
      window.location.href = "/auth";
    }
    return Promise.reject(err);
  }
);

export default api;
