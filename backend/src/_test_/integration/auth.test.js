/**
 * Integration tests for /api/auth
 *
 * Endpoints covered:
 *  POST   /api/auth/register
 *  POST   /api/auth/login
 *  GET    /api/auth/profile
 *  PUT    /api/auth/profile
 *  POST   /api/auth/logout
 *
 * Stack: Mocha + Chai (expect) + Supertest
 * DB:    mongodb-memory-server (isolated, wiped between tests)
 */

import { expect } from "chai";
import request from "supertest";
import app from "../helpers/testApp.js";

// JWT env vars and DB lifecycle are managed by mocha.setup.js root hooks

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register with sensible defaults.
 * Any field can be overridden via `overrides`.
 */
function registerUser(overrides = {}) {
  const defaults = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  };
  return request(app)
    .post("/api/auth/register")
    .send({ ...defaults, ...overrides });
}

/**
 * Register then login a user and return the Bearer token.
 * Wraps each step so a setup failure surfaces with clear context rather
 * than cascading as "Cannot read properties of undefined (reading 'token')"
 * across every test in the suite.
 */
async function getAuthToken(
  email = "test@example.com",
  password = "password123"
) {
  let registerRes;
  try {
    registerRes = await registerUser({ email, password });
  } catch (err) {
    throw new Error(`getAuthToken: register step failed — ${err.message}`);
  }
  if (registerRes.status !== 201) {
    throw new Error(
      `getAuthToken: register returned ${registerRes.status} — ${JSON.stringify(registerRes.body)}`
    );
  }

  let loginRes;
  try {
    loginRes = await request(app).post("/api/auth/login").send({ email, password });
  } catch (err) {
    throw new Error(`getAuthToken: login step failed — ${err.message}`);
  }
  if (!loginRes.body.token) {
    throw new Error(
      `getAuthToken: login returned ${loginRes.status} with no token — ${JSON.stringify(loginRes.body)}`
    );
  }

  return loginRes.body.token;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  // ── Happy path ───────────────────────────────────────────────────────────────
  it("should register a new user and return 201 with a JWT token", async () => {
    const res = await registerUser();

    expect(res.status).to.equal(201);
    expect(res.body.success).to.be.true;
    expect(res.body.token).to.be.a("string").and.to.have.length.above(0);
  });

  it("should return the serialized user object (no password field)", async () => {
    const res = await registerUser();

    expect(res.body.user).to.include.keys("id", "name", "email", "createdAt");
    expect(res.body.user.email).to.equal("test@example.com");
    expect(res.body.user).to.not.have.property("password");
  });

  it("should return a success message", async () => {
    const res = await registerUser();
    expect(res.body.message).to.match(/registered successfully/i);
  });

  // ── Validation errors ────────────────────────────────────────────────────────
  it("should return 400 when `name` is missing", async () => {
    const res = await registerUser({ name: "" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when `email` is missing", async () => {
    const res = await registerUser({ email: "" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when `email` is not a valid email address", async () => {
    const res = await registerUser({ email: "not-an-email" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when `password` is shorter than 6 characters", async () => {
    const res = await registerUser({ password: "abc" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when `name` exceeds 100 characters", async () => {
    const res = await registerUser({ name: "a".repeat(101) });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when the request body is completely empty", async () => {
    const res = await request(app).post("/api/auth/register").send({});

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  // ── Duplicate email ───────────────────────────────────────────────────────────
  it("should return 409 when the email is already registered", async () => {
    await registerUser();
    const res = await registerUser(); // same email

    expect(res.status).to.equal(409);
    expect(res.body.success).to.be.false;
    expect(res.body.message).to.match(/email already exists/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  // Ensure a user exists before every login test
  beforeEach(() => registerUser());

  // ── Happy path ───────────────────────────────────────────────────────────────
  it("should return 200 with a JWT token on valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.token).to.be.a("string").and.to.have.length.above(0);
  });

  it("should return the serialized user (no password) on successful login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.body.user).to.include.keys("id", "name", "email");
    expect(res.body.user).to.not.have.property("password");
  });

  it("should return a success message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.body.message).to.match(/login successful/i);
  });

  // ── Auth failures ────────────────────────────────────────────────────────────
  it("should return 401 when the password is incorrect", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrongpassword" });

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });

  it("should return 401 when the email does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "password123" });

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });

  it("should NOT reveal whether the email or password was wrong (same message)", async () => {
    const badEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "password123" });

    const badPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrongpassword" });

    expect(badEmail.body.message).to.equal(badPassword.body.message);
  });

  // ── Validation errors ────────────────────────────────────────────────────────
  it("should return 400 when `email` is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "password123" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when `password` is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when `email` is not a valid email address", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/profile
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/auth/profile", () => {
  let token;

  beforeEach(async () => {
    token = await getAuthToken();
  });

  // ── Happy path ───────────────────────────────────────────────────────────────
  it("should return 200 with the user profile when a valid token is sent", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.user.email).to.equal("test@example.com");
  });

  it("should include expected user fields (id, name, email, createdAt)", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.user).to.include.keys("id", "name", "email", "createdAt");
  });

  it("should NOT expose the password field in the profile response", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.user).to.not.have.property("password");
  });

  // ── Auth failures ────────────────────────────────────────────────────────────
  it("should return 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/auth/profile");

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });

  it("should return 401 when the token is malformed", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", "Bearer this.is.garbage");

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });

  it("should return 401 when the token is signed with the wrong secret", async () => {
    // Manually sign a token with a different secret
    const { default: jwt } = await import("jsonwebtoken");
    const fakeToken = jwt.sign({ id: "fake" }, "wrong_secret", {
      expiresIn: "1h",
    });

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });

  it("should return 401 when 'Bearer' prefix is omitted", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", token); // no "Bearer " prefix

    expect(res.status).to.equal(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/profile
// ─────────────────────────────────────────────────────────────────────────────

describe("PUT /api/auth/profile", () => {
  let token;

  beforeEach(async () => {
    token = await getAuthToken();
  });

  // ── Happy path ───────────────────────────────────────────────────────────────
  it("should update the user's name and return 200", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name" });

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.user.name).to.equal("Updated Name");
  });

  it("should update the password and allow login with the new password", async () => {
    await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "newPassword456" });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "newPassword456" });

    expect(loginRes.status).to.equal(200);
    expect(loginRes.body.success).to.be.true;
  });

  it("should deny login with the OLD password after a password change", async () => {
    await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "newPassword456" });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(loginRes.status).to.equal(401);
  });

  it("should return the updated user without exposing the password", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Name" });

    expect(res.body.user).to.not.have.property("password");
  });

  it("should return a success message", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Any Name" });

    expect(res.body.message).to.match(/updated successfully/i);
  });

  // ── Validation errors ────────────────────────────────────────────────────────
  it("should return 400 when name is an empty string", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when name exceeds 100 characters", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "a".repeat(101) });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when the new password is shorter than 6 characters", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "abc" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  // ── Auth guard ────────────────────────────────────────────────────────────────
  it("should return 401 when no token is provided", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .send({ name: "Hacker" });

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  let token;

  beforeEach(async () => {
    token = await getAuthToken();
  });

  // ── Happy path ───────────────────────────────────────────────────────────────
  it("should return 200 with a success flag when a valid token is provided", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
  });

  it("should return a logout success message", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.message).to.match(/logout successful/i);
  });

  // ── Auth guard ────────────────────────────────────────────────────────────────
  it("should return 401 when no token is provided", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });

  it("should return 401 when an invalid token is provided", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// General / infrastructure
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /", () => {
  it("should return 200 with a health-check message", async () => {
    const res = await request(app).get("/");

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.message).to.be.a("string");
  });
});

describe("404 handler", () => {
  it("should return 404 for an unknown route", async () => {
    const res = await request(app).get("/api/does-not-exist");

    expect(res.status).to.equal(404);
  });
});
