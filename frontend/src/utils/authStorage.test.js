import { getToken, saveToken, removeToken } from "./authStorage";

const TOKEN_KEY = "notesToken";

describe("authStorage", () => {
  // localStorage is cleared in afterEach by jest.setup.js

  describe("getToken", () => {
    it("returns null when nothing is stored", () => {
      expect(getToken()).toBeNull();
    });

    it("returns the token that was previously saved", () => {
      localStorage.setItem(TOKEN_KEY, "abc123");
      expect(getToken()).toBe("abc123");
    });

    it("returns the most recently saved value", () => {
      localStorage.setItem(TOKEN_KEY, "first");
      localStorage.setItem(TOKEN_KEY, "second");
      expect(getToken()).toBe("second");
    });
  });

  describe("saveToken", () => {
    it("persists the token under the correct key", () => {
      saveToken("my-jwt-token");
      expect(localStorage.getItem(TOKEN_KEY)).toBe("my-jwt-token");
    });

    it("overwrites any previously stored token", () => {
      saveToken("old-token");
      saveToken("new-token");
      expect(localStorage.getItem(TOKEN_KEY)).toBe("new-token");
    });

    it("saves an empty string without throwing", () => {
      expect(() => saveToken("")).not.toThrow();
      expect(localStorage.getItem(TOKEN_KEY)).toBe("");
    });
  });

  describe("removeToken", () => {
    it("removes the token from localStorage", () => {
      localStorage.setItem(TOKEN_KEY, "to-be-removed");
      removeToken();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it("does not throw when no token is present", () => {
      expect(() => removeToken()).not.toThrow();
    });

    it("leaves unrelated localStorage keys intact", () => {
      localStorage.setItem("otherKey", "otherValue");
      localStorage.setItem(TOKEN_KEY, "token");
      removeToken();
      expect(localStorage.getItem("otherKey")).toBe("otherValue");
    });
  });

  describe("round-trip", () => {
    it("save → get → remove cycle works correctly", () => {
      saveToken("round-trip-token");
      expect(getToken()).toBe("round-trip-token");
      removeToken();
      expect(getToken()).toBeNull();
    });
  });
});
