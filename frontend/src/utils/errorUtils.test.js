import { normalizeApiError } from "./errorUtils";

describe("normalizeApiError", () => {
  describe("message extraction priority", () => {
    it("prefers error.response.data.message over everything else", () => {
      const error = {
        response: { data: { message: "Server validation failed" } },
        message: "Request failed with status 400",
      };
      const result = normalizeApiError(error, "Fallback");
      expect(result.message).toBe("Server validation failed");
    });

    it("falls back to error.message when response.data.message is absent", () => {
      const error = { message: "Network Error" };
      const result = normalizeApiError(error, "Fallback");
      expect(result.message).toBe("Network Error");
    });

    it("falls back to the provided fallbackMessage when both are absent", () => {
      const result = normalizeApiError({}, "Could not load notes.");
      expect(result.message).toBe("Could not load notes.");
    });

    it("uses the default fallback message when none is provided", () => {
      const result = normalizeApiError({});
      expect(result.message).toBe("Request failed");
    });
  });

  describe("return type", () => {
    it("always returns an Error instance", () => {
      expect(normalizeApiError({})).toBeInstanceOf(Error);
      expect(normalizeApiError(null)).toBeInstanceOf(Error);
      expect(normalizeApiError("string error")).toBeInstanceOf(Error);
      expect(normalizeApiError(42)).toBeInstanceOf(Error);
    });
  });

  describe("property forwarding", () => {
    it("copies the response property onto the normalized error", () => {
      const response = { status: 422, data: { message: "Unprocessable" } };
      const error = { response };
      const result = normalizeApiError(error);
      expect(result.response).toBe(response);
    });

    it("copies the code property onto the normalized error", () => {
      const error = { code: "ERR_CANCELED", message: "canceled" };
      const result = normalizeApiError(error);
      expect(result.code).toBe("ERR_CANCELED");
    });

    it("copies the status property onto the normalized error", () => {
      const error = { status: 503 };
      const result = normalizeApiError(error);
      expect(result.status).toBe(503);
    });

    it("does not add undefined properties when they are missing", () => {
      const result = normalizeApiError({ message: "plain error" });
      expect(result.response).toBeUndefined();
      expect(result.code).toBeUndefined();
      expect(result.status).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("handles null input without throwing", () => {
      expect(() => normalizeApiError(null)).not.toThrow();
    });

    it("handles undefined input without throwing", () => {
      expect(() => normalizeApiError(undefined)).not.toThrow();
    });

    it("handles a plain string input without throwing", () => {
      expect(() => normalizeApiError("oops")).not.toThrow();
    });

    it("handles an Error instance as the source", () => {
      const originalError = new Error("original message");
      const result = normalizeApiError(originalError, "fallback");
      expect(result.message).toBe("original message");
      expect(result).toBeInstanceOf(Error);
    });

    it("handles empty response.data without throwing", () => {
      const error = { response: { data: {} }, message: "fallback msg" };
      const result = normalizeApiError(error);
      expect(result.message).toBe("fallback msg");
    });
  });
});
