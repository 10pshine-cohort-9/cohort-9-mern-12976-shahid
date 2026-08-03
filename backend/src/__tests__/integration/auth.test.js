import request from "supertest";
import app from "../helpers/testApp.js";
import { connectTestDB, clearTestDB, closeTestDB } from "../helpers/db.js";

process.env.JWT_SECRET = "test_secret_key";
process.env.JWT_EXPIRES_IN = "7d";

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

// Helper to register a user and return the response
const registerUser = (data = {}) => {
  const defaults = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  };
  return request(app)
    .post("/api/auth/register")
    .send({ ...defaults, ...data });
};

// Helper to login and return the token
const loginAndGetToken = async (email = "test@example.com", password = "password123") => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return res.body.token;
};

describe("POST /api/auth/register", () => {
  it("should register a new user and return 201 with a token", async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.password).toBeUndefined(); // never expose password
  });

  it("should return 400 if any required field is missing", async () => {
    const res = await registerUser({ name: "", email: "", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 409 if email already exists", async () => {
    await registerUser();
    const res = await registerUser(); // same email

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/email already exists/i);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => await registerUser());

  it("should login with valid credentials and return a token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it("should return 401 with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 if user does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if email or password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/auth/profile", () => {
  beforeEach(async () => await registerUser());

  it("should return user profile with a valid token", async () => {
    const token = await loginAndGetToken();

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("should return 401 without a token", async () => {
    const res = await request(app).get("/api/auth/profile");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 with an invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/logout", () => {
  beforeEach(async () => await registerUser());

  it("should logout successfully with a valid token", async () => {
    const token = await loginAndGetToken();

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 401 without a token", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(401);
  });
});
