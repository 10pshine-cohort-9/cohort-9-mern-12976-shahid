import axios from 'axios';
import { getToken, removeToken } from '../utils/authStorage';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";

      const isPublicAuthRequest =
        url.includes("/auth/login") || url.includes("/auth/register");

      if (!isPublicAuthRequest) {
        removeToken();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);
export default apiClient;
