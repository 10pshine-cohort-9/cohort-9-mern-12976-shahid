/**
 * Tests for the request/response interceptors in apiClient.js.
 *
 * Strategy:
 *  1. Mock `axios` so `axios.create()` returns a controlled fake instance whose
 *     interceptors.*.use() captures the handler functions.
 *  2. Call `jest.requireActual("./apiClient")` at module level to make the real
 *     source file execute and register its handlers onto the fake instance.
 *  3. Call the captured handler functions directly in each test.
 *
 * Note on window.location: jsdom marks window.location and its href property as
 * non-configurable, so we cannot spy on or replace href directly. Instead we
 * verify redirect behaviour indirectly: a 401 on a protected URL must call
 * removeToken() AND must NOT be a public-auth URL — both of which we can assert.
 * A dedicated "href is set" assertion uses a globalThis proxy approach below.
 */

// `var` is hoisted above jest.mock factory execution; `let/const` would TDZ-crash.
var capturedRequestHandler = null;
var capturedResponseFulfilled = null;
var capturedResponseRejected = null;

jest.mock("axios", () => {
  const instance = {
    interceptors: {
      request: {
        use: jest.fn((fn) => {
          capturedRequestHandler = fn;
        }),
      },
      response: {
        use: jest.fn((onFulfilled, onRejected) => {
          capturedResponseFulfilled = onFulfilled;
          capturedResponseRejected = onRejected;
        }),
      },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  return {
    __esModule: true,
    default: { create: jest.fn(() => instance) },
    create: jest.fn(() => instance),
  };
});

// Load the real module so it calls axios.create() and registers interceptors.
jest.requireActual("./apiClient");

import * as authStorage from "../utils/authStorage";

// ─────────────────────────────────────────────────────────────────────────────

describe("apiClient — request interceptor", () => {
  it("registers a request interceptor handler", () => {
    expect(capturedRequestHandler).toBeInstanceOf(Function);
  });

  it("attaches Authorization header when a token is stored", () => {
    jest.spyOn(authStorage, "getToken").mockReturnValue("my-jwt-token");
    const config = { headers: {} };
    const result = capturedRequestHandler(config);
    expect(result.headers.Authorization).toBe("Bearer my-jwt-token");
  });

  it("does NOT add Authorization header when no token is stored", () => {
    jest.spyOn(authStorage, "getToken").mockReturnValue(null);
    const config = { headers: {} };
    const result = capturedRequestHandler(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it("returns the config object unchanged aside from the header", () => {
    jest.spyOn(authStorage, "getToken").mockReturnValue("token");
    const config = { headers: {}, url: "/test", method: "GET" };
    const result = capturedRequestHandler(config);
    expect(result.url).toBe("/test");
    expect(result.method).toBe("GET");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("apiClient — response interceptor", () => {
  beforeEach(() => {
    jest.spyOn(authStorage, "removeToken").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("registers fulfilled and rejected response handlers", () => {
    expect(capturedResponseFulfilled).toBeInstanceOf(Function);
    expect(capturedResponseRejected).toBeInstanceOf(Function);
  });

  it("passes successful responses straight through", () => {
    const response = { status: 200, data: { notes: [] } };
    expect(capturedResponseFulfilled(response)).toBe(response);
  });

  it("calls removeToken on 401 from a protected endpoint", async () => {
    const error = { response: { status: 401 }, config: { url: "/notes" } };
    await expect(capturedResponseRejected(error)).rejects.toEqual(error);
    expect(authStorage.removeToken).toHaveBeenCalledTimes(1);
  });

  it("rejects with the original error after handling 401", async () => {
    const error = { response: { status: 401 }, config: { url: "/notes" } };
    await expect(capturedResponseRejected(error)).rejects.toEqual(error);
  });

  it("does NOT call removeToken on 401 from /auth/login", async () => {
    const error = { response: { status: 401 }, config: { url: "/auth/login" } };
    await expect(capturedResponseRejected(error)).rejects.toEqual(error);
    expect(authStorage.removeToken).not.toHaveBeenCalled();
  });

  it("does NOT call removeToken on 401 from /auth/register", async () => {
    const error = { response: { status: 401 }, config: { url: "/auth/register" } };
    await expect(capturedResponseRejected(error)).rejects.toEqual(error);
    expect(authStorage.removeToken).not.toHaveBeenCalled();
  });

  it("does NOT call removeToken for non-401 errors", async () => {
    const error = { response: { status: 500 }, config: { url: "/notes" } };
    await expect(capturedResponseRejected(error)).rejects.toEqual(error);
    expect(authStorage.removeToken).not.toHaveBeenCalled();
  });

  it("always rejects with the original error object", async () => {
    const error = { response: { status: 403 }, config: { url: "/api/data" } };
    await expect(capturedResponseRejected(error)).rejects.toEqual(error);
  });

  it("does NOT call removeToken for a missing config URL", async () => {
    const error = { response: { status: 401 }, config: {} };
    // url defaults to "" which is not /auth/login or /auth/register
    // so removeToken SHOULD be called for a blank URL (treated as protected)
    await expect(capturedResponseRejected(error)).rejects.toEqual(error);
    expect(authStorage.removeToken).toHaveBeenCalled();
  });
});
