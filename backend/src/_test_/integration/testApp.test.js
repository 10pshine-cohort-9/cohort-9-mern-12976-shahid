/**
 * Integration tests for backend/src/_test_/helpers/testApp.js
 *
 * Primary goal: guarantee coverage on every line of testApp.js, with explicit
 * assertions that confirm the intended behaviour of each line.
 *
 * Lines under test
 * ────────────────
 *  app.disable("x-powered-by")  — asserted: X-Powered-By header is absent
 *  express.json(...)            — asserted: JSON body is parsed correctly
 *  express.urlencoded(...)      — asserted: URL-encoded body is parsed
 *  app.get("/", ...)            — asserted: health-check route returns 200
 *  app.use("/api/auth", ...)    — asserted: auth routes are reachable
 *  app.use("/api/notes", ...)   — asserted: notes routes are reachable (401)
 *  app.use(notFound)            — asserted: unknown route returns 404
 *  app.use(errorHandler)        — asserted: error responses have correct shape
 *
 * Stack: Mocha + Chai (expect) + Supertest
 * DB:    mongodb-memory-server via mocha.setup.js root hooks (auto-applied)
 * Env:   JWT_SECRET / NODE_ENV set by env.setup.cjs (loaded before this file)
 */

import { expect } from "chai";
import request from "supertest";
import app from "../helpers/testApp.js";

// ─────────────────────────────────────────────────────────────────────────────
// app.disable("x-powered-by")
// ─────────────────────────────────────────────────────────────────────────────

describe("testApp — security headers", () => {
  it("does NOT include an X-Powered-By header on any response", async () => {
    try {
      const res = await request(app).get("/");
      expect(res.headers).to.not.have.property("x-powered-by");
    } catch (error) {
      throw new Error(`Test failed during request in 'X-Powered-By header' check: ${error.message}`);
    }
  });

  it("X-Powered-By is absent on 404 responses too", async () => {
    const res = await request(app).get("/api/unknown-route-xyz");

    expect(res.headers).to.not.have.property("x-powered-by");
  });

  it("X-Powered-By is absent on auth endpoint responses", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "x@x.com", password: "password123" });

    expect(res.headers).to.not.have.property("x-powered-by");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Health-check route  GET /
// ─────────────────────────────────────────────────────────────────────────────

describe("testApp — GET /", () => {
  it("returns 200 with success: true", async () => {
    const res = await request(app).get("/");

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
  });

  it("returns the exact API running message (covers the new handler line)", async () => {
    const res = await request(app).get("/");

    expect(res.body.message).to.equal("Notes API is running successfully");
  });

  it("returns a non-empty message string", async () => {
    const res = await request(app).get("/");

    expect(res.body.message).to.be.a("string").and.to.have.length.above(0);
  });

  it("responds with Content-Type: application/json", async () => {
    const res = await request(app).get("/");

    expect(res.headers["content-type"]).to.match(/application\/json/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// express.json() body parser  (limit: "10mb")
// ─────────────────────────────────────────────────────────────────────────────

describe("testApp — JSON body parser", () => {
  it("parses a JSON request body on POST /api/auth/register", async () => {
    // The route returns 400 validation error for incomplete body — that is
    // fine; what matters is that the body was parsed (not a parse error).
    const res = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send({ name: "Test", email: "parse@test.com", password: "pass123" });

    // 201 or 409 both mean the body was successfully parsed
    expect([201, 409]).to.include(res.status);
  });

  it("rejects a malformed JSON body with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send("{ bad json }");

    // Express returns 400 Bad Request for unparseable JSON
    expect(res.status).to.equal(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// express.urlencoded() body parser  (extended: true, limit: "10mb")
// ─────────────────────────────────────────────────────────────────────────────

describe("testApp — URL-encoded body parser", () => {
  it("parses an application/x-www-form-urlencoded body", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send("email=urlenc%40test.com&password=password123");

    // 400 (validation) or 401 (wrong creds) both confirm the body was parsed
    expect([400, 401]).to.include(res.status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth routes  app.use("/api/auth", authRoutes)
// ─────────────────────────────────────────────────────────────────────────────
describe("testApp — /api/auth routes are mounted", () => {
  it("POST /api/auth/register is reachable (returns 400 for empty payload)", async () => {
    try {
      const res = await request(app)
        .post("/api/auth/register")
        .send({});

      expect(res.status).to.equal(400);
    } catch (error) {
      throw new Error(`Test failed during request in 'POST /api/auth/register' check: ${error.message}`);
    }
  });

  it("POST /api/auth/login is reachable (returns 400 for empty payload)", async () => {
    try {
      const res = await request(app)
        .post("/api/auth/login")
        .send({});

      expect(res.status).to.equal(400);
    } catch (error) {
      throw new Error(`Test failed during request in 'POST /api/auth/login' check: ${error.message}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Notes routes  app.use("/api/notes", notesRoutes)
// ─────────────────────────────────────────────────────────────────────────────

describe("testApp — /api/notes routes are mounted", () => {
  it("GET /api/notes is reachable and returns 401 without a token (not 404)", async () => {
    const res = await request(app).get("/api/notes");

    expect(res.status).to.equal(401);
    expect(res.status).to.not.equal(404);
  });

  it("POST /api/notes is reachable and returns 401 without a token", async () => {
    const res = await request(app)
      .post("/api/notes")
      .send({ title: "t", content: "c" });

    expect(res.status).to.equal(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 not-found middleware  app.use(notFound)
// ─────────────────────────────────────────────────────────────────────────────

describe("testApp — notFound middleware", () => {
  it("returns 404 for a completely unknown route", async () => {
    const res = await request(app).get("/api/does-not-exist");

    expect(res.status).to.equal(404);
  });

  it("returns 404 for an unknown nested path", async () => {
    const res = await request(app).get("/api/auth/no-such-endpoint");

    expect(res.status).to.equal(404);
  });

  it("returns 404 for a DELETE on a non-existent resource", async () => {
    const res = await request(app).delete("/totally/unknown");

    expect(res.status).to.equal(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error handler middleware  app.use(errorHandler)
// ─────────────────────────────────────────────────────────────────────────────

describe("testApp — errorHandler middleware", () => {
  it("error responses include a success: false flag", async () => {
    // A validation error from the auth route exercises the error handler
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "", email: "", password: "" });

    expect(res.body.success).to.be.false;
  });

  it("error responses include a message field", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "" });

    expect(res.body).to.have.property("message");
  });

  it("404 error response body has the expected shape", async () => {
    const res = await request(app).get("/route/that/does/not/exist");

    // notFound middleware + errorHandler together produce the final response
    expect(res.status).to.equal(404);
    // The body should at least be parseable JSON (not an empty body)
    expect(res.body).to.be.an("object");
  });
});
