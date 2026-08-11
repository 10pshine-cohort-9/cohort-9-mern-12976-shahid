/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
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
        // Support both { data: { user } } and { user } response shapes
        const user = res.data?.data?.user ?? res.data?.user ?? res.data;
        setUser(user);
      } catch {
        // Token is invalid or expired — clean it up
        removeToken();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function login(email, password) {
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      // Support both { data: { token, user } } and { token, user } response shapes
      const token = res.data?.data?.token ?? res.data?.token;
      const loggedInUser = res.data?.data?.user ?? res.data?.user;

      if (!token || !loggedInUser) {
        throw new Error("Invalid response: Missing token or user data.");
      }

      saveToken(token);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || error.message || "Login failed",
        { cause: error },
      );
    }
  }

  async function register(name, email, password) {
    try {
      const res = await apiClient.post("/auth/register", {
        name,
        email,
        password,
      });
      // Support both { data: { token, user } } and { token, user } response shapes
      const token = res.data?.data?.token ?? res.data?.token;
      const newUser = res.data?.data?.user ?? res.data?.user;

      if (!token || !newUser) {
        throw new Error("Invalid response: Missing token or user data.");
      }

      saveToken(token);
      setUser(newUser);
      return newUser;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || error.message || "Registration failed",
        { cause: error },
      );
    }
  }

  async function updateUser({ name, password, imageFile }) {
    try {
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
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Profile update failed",
        { cause: error },
      );
    }
  }

  async function logout() {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Even if the request fails, still clear local auth state
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
