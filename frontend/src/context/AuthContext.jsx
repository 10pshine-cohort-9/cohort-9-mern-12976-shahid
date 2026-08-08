/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { getToken, saveToken, removeToken } from "../utils/authStorage";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get("/auth/profile");

        const user = res.data?.data?.user ?? res.data?.user ?? res.data;
        setUser(user);
      } catch {
        removeToken();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function login(email, password) {
    const res = await apiClient.post("/auth/login", { email, password });
    const token = res.data?.data?.token ?? res.data?.token;
    const loggedInUser = res.data?.data?.user ?? res.data?.user;
    saveToken(token);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(name, email, password) {
    const res = await apiClient.post("/auth/register", {
      name,
      email,
      password,
    });
    return res.data?.data?.user ?? res.data?.user ?? res.data;
  }

  async function updateUser({ name, password, imageFile }) {
    const payload = imageFile ? new FormData() : { name, password };

    if (imageFile) {
      payload.append("name", name);
      if (password) {
        payload.append("password", password);
      }
      payload.append("image", imageFile);
    }

    const res = await apiClient.put(
      "/auth/profile",
      payload,
      imageFile
        ? {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        : undefined,
    );
    const updatedUser = res.data?.data?.user ?? res.data?.user ?? res.data;
    setUser(updatedUser);
    return updatedUser;
  }

  async function logout() {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Clear local auth even if the backend logout request fails.
    }
    removeToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, updateUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
