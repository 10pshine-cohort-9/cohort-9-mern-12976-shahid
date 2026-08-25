/**
 * Integration tests for /api/notes
 *
 * Endpoints covered:
 *  POST   /api/notes          – create a note
 *  GET    /api/notes          – list all notes (+ search query)
 *  GET    /api/notes/:id      – get a single note
 *  PUT    /api/notes/:id      – update a note
 *  DELETE /api/notes/:id      – delete a note
 *
 * Security invariants verified on every mutating endpoint:
 *  - Requires a valid Bearer token (401 without one)
 *  - Enforces ownership — user A cannot read/modify/delete user B's notes
 *
 * Stack: Mocha + Chai (expect) + Supertest
 * DB:    mongodb-memory-server (isolated, wiped between tests)
 */

import { expect } from "chai";
import request from "supertest";
import app from "../helpers/testApp.js";

// JWT env vars and DB lifecycle are managed by mocha.setup.js root hooks

// ── Shared helpers ────────────────────────────────────────────────────────────

let userCounter = 0;

/**
 * Register a unique user and return their Bearer token.
 * Uses an auto-incrementing counter so parallel helper calls never collide.
 * Wraps each step so a setup failure surfaces with clear context rather
 * than cascading as "Cannot read properties of undefined (reading '_id')"
 * across every test in the suite.
 */
async function createUserAndGetToken(nameSuffix = "") {
  userCounter += 1;
  const email = `user${userCounter}${nameSuffix}@notes-test.com`;
  const password = "password123";

  let registerRes;
  try {
    registerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: `Test User ${userCounter}`, email, password });
  } catch (err) {
    throw new Error(`createUserAndGetToken: register step failed — ${err.message}`);
  }
  if (registerRes.status !== 201) {
    throw new Error(
      `createUserAndGetToken: register returned ${registerRes.status} — ${JSON.stringify(registerRes.body)}`
    );
  }

  let loginRes;
  try {
    loginRes = await request(app).post("/api/auth/login").send({ email, password });
  } catch (err) {
    throw new Error(`createUserAndGetToken: login step failed — ${err.message}`);
  }
  if (!loginRes.body.token) {
    throw new Error(
      `createUserAndGetToken: login returned ${loginRes.status} with no token — ${JSON.stringify(loginRes.body)}`
    );
  }

  return loginRes.body.token;
}

/**
 * POST /api/notes — thin wrapper for readability.
 * `overrides` lets individual tests change title / content.
 */
function postNote(token, overrides = {}) {
  const defaults = { title: "Test Note", content: "Test content body" };
  return request(app)
    .post("/api/notes")
    .set("Authorization", `Bearer ${token}`)
    .send({ ...defaults, ...overrides });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notes
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/notes", () => {
  // ── Happy path ───────────────────────────────────────────────────────────────
  it("should create a note and return 201 with the note document", async () => {
    const token = await createUserAndGetToken();
    const res = await postNote(token);

    expect(res.status).to.equal(201);
    expect(res.body.success).to.be.true;
    expect(res.body.note).to.exist;
    expect(res.body.note.title).to.equal("Test Note");
    expect(res.body.note.content).to.equal("Test content body");
  });

  it("should return a success message", async () => {
    const token = await createUserAndGetToken();
    const res = await postNote(token);

    expect(res.body.message).to.match(/created successfully/i);
  });

  it("should embed the authenticated user's id in `note.userId`", async () => {
    const token = await createUserAndGetToken();
    const profileRes = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);
    const userId = profileRes.body.user.id;

    const res = await postNote(token);
    expect(res.body.note.userId).to.equal(userId);
  });

  it("should set createdAt and updatedAt timestamps", async () => {
    const token = await createUserAndGetToken();
    const res = await postNote(token);

    expect(res.body.note.createdAt).to.be.a("string");
    expect(res.body.note.updatedAt).to.be.a("string");
  });

  // ── Validation errors ────────────────────────────────────────────────────────
  it("should return 400 when `title` is an empty string", async () => {
    const token = await createUserAndGetToken();
    const res = await postNote(token, { title: "" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when `content` is an empty string", async () => {
    const token = await createUserAndGetToken();
    const res = await postNote(token, { content: "" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when `title` exceeds 200 characters", async () => {
    const token = await createUserAndGetToken();
    const res = await postNote(token, { title: "t".repeat(201) });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when both title and content are missing", async () => {
    const token = await createUserAndGetToken();
    const res = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    // express-validator fires first (title optional but notEmpty check)
    // controller also checks; either way the status must be 4xx
    expect(res.status).to.be.within(400, 422);
    expect(res.body.success).to.be.false;
  });

  // ── Auth guard ────────────────────────────────────────────────────────────────
  it("should return 401 when no token is provided", async () => {
    const res = await request(app)
      .post("/api/notes")
      .send({ title: "Anon", content: "No auth" });

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });

  it("should return 401 when an invalid token is provided", async () => {
    const res = await request(app)
      .post("/api/notes")
      .set("Authorization", "Bearer badtoken")
      .send({ title: "Hack", content: "Attempt" });

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notes
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/notes", () => {
  // ── Happy path ───────────────────────────────────────────────────────────────
  it("should return 200 with an empty notes array when the user has no notes", async () => {
    const token = await createUserAndGetToken();
    const res = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.notes).to.be.an("array").that.is.empty;
    expect(res.body.total).to.equal(0);
  });

  it("should return all notes belonging to the authenticated user", async () => {
    const token = await createUserAndGetToken();
    await postNote(token, { title: "Note 1", content: "Content 1" });
    await postNote(token, { title: "Note 2", content: "Content 2" });
    await postNote(token, { title: "Note 3", content: "Content 3" });

    const res = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.total).to.equal(3);
    expect(res.body.notes).to.have.lengthOf(3);
  });

  it("should return notes sorted by updatedAt descending (newest first)", async () => {
    const token = await createUserAndGetToken();
    await postNote(token, { title: "Oldest", content: "..." });
    await postNote(token, { title: "Newest", content: "..." });

    const res = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${token}`);

    const dates = res.body.notes.map((n) => new Date(n.updatedAt).getTime());
    expect(dates[0]).to.be.at.least(dates[1]);
  });

  // ── Ownership isolation ───────────────────────────────────────────────────────
  it("should NOT return notes belonging to a different user", async () => {
    const tokenA = await createUserAndGetToken();
    const tokenB = await createUserAndGetToken();

    await postNote(tokenA, { title: "User A note", content: "Private A" });
    await postNote(tokenB, { title: "User B note", content: "Private B" });

    const resA = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(resA.body.total).to.equal(1);
    expect(resA.body.notes[0].title).to.equal("User A note");
  });

  // ── Search ────────────────────────────────────────────────────────────────────
  it("should filter notes by title when ?search= is provided", async () => {
    const token = await createUserAndGetToken();
    await postNote(token, { title: "JavaScript Tips", content: "Use const." });
    await postNote(token, { title: "Python Guide", content: "Indentation." });
    await postNote(token, { title: "More JS", content: "Async/await rocks." });

    const res = await request(app)
      .get("/api/notes?search=JavaScript")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.total).to.equal(1);
    expect(res.body.notes[0].title).to.equal("JavaScript Tips");
  });

  it("should filter notes by content when ?search= matches content", async () => {
    const token = await createUserAndGetToken();
    await postNote(token, { title: "Note A", content: "Mongoose is great" });
    await postNote(token, { title: "Note B", content: "Express is fast" });

    const res = await request(app)
      .get("/api/notes?search=mongoose")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.total).to.equal(1);
    expect(res.body.notes[0].content).to.match(/mongoose is great/i);
  });

  it("should perform case-insensitive search", async () => {
    const token = await createUserAndGetToken();
    await postNote(token, { title: "UPPERCASE TITLE", content: "stuff" });

    const res = await request(app)
      .get("/api/notes?search=uppercase")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.total).to.equal(1);
  });

  it("should return all notes when ?search= is an empty string", async () => {
    const token = await createUserAndGetToken();
    await postNote(token, { title: "A", content: "1" });
    await postNote(token, { title: "B", content: "2" });

    const res = await request(app)
      .get("/api/notes?search=")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.total).to.equal(2);
  });

  // ── Auth guard ────────────────────────────────────────────────────────────────
  it("should return 401 when no token is provided", async () => {
    const res = await request(app).get("/api/notes");

    expect(res.status).to.equal(401);
    expect(res.body.success).to.be.false;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notes/:id
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/notes/:id", () => {
  // ── Happy path ───────────────────────────────────────────────────────────────
  it("should return 200 with the note when the owner requests it", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .get(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.note._id).to.equal(noteId);
    expect(res.body.note.title).to.equal("Test Note");
  });

  // ── Not found ────────────────────────────────────────────────────────────────
  it("should return 404 for a valid ObjectId that does not exist", async () => {
    const token = await createUserAndGetToken();

    const res = await request(app)
      .get("/api/notes/64a1b2c3d4e5f6a7b8c9d0e1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(404);
    expect(res.body.success).to.be.false;
  });

  // ── Invalid ID ────────────────────────────────────────────────────────────────
  it("should return 400 for a malformed (non-ObjectId) note id", async () => {
    const token = await createUserAndGetToken();

    const res = await request(app)
      .get("/api/notes/not-a-valid-id")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  // ── Ownership ─────────────────────────────────────────────────────────────────
  it("should return 404 when a different user tries to access the note", async () => {
    const tokenA = await createUserAndGetToken();
    const tokenB = await createUserAndGetToken();

    const created = await postNote(tokenA);
    const noteId = created.body.note._id;

    const res = await request(app)
      .get(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).to.equal(404);
  });

  // ── Auth guard ────────────────────────────────────────────────────────────────
  it("should return 401 when no token is provided", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    const res = await request(app).get(`/api/notes/${noteId}`);

    expect(res.status).to.equal(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/notes/:id
// ─────────────────────────────────────────────────────────────────────────────

describe("PUT /api/notes/:id", () => {
  // ── Happy path ───────────────────────────────────────────────────────────────
  it("should update the title and return 200 with the updated note", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated Title", content: "Updated content" });

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.note.title).to.equal("Updated Title");
    expect(res.body.note.content).to.equal("Updated content");
  });

  it("should allow a partial update (title only)", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token, {
      title: "Original",
      content: "Keep this",
    });
    const noteId = created.body.note._id;

    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Changed Title" });

    expect(res.status).to.equal(200);
    expect(res.body.note.title).to.equal("Changed Title");
    expect(res.body.note.content).to.equal("Keep this");
  });

  it("should allow a partial update (content only)", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token, {
      title: "Keep this",
      content: "Original content",
    });
    const noteId = created.body.note._id;

    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Changed content" });

    expect(res.status).to.equal(200);
    expect(res.body.note.title).to.equal("Keep this");
    expect(res.body.note.content).to.equal("Changed content");
  });

  it("should return a success message", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New Title" });

    expect(res.body.message).to.match(/updated successfully/i);
  });

  // ── Validation errors ────────────────────────────────────────────────────────
  it("should return 400 when updating title to an empty string", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 when updating title to more than 200 characters", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "t".repeat(201) });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 for a malformed note id", async () => {
    const token = await createUserAndGetToken();

    const res = await request(app)
      .put("/api/notes/bad-id")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New" });

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  // ── Not found ────────────────────────────────────────────────────────────────
  it("should return 404 for a valid ObjectId that does not exist", async () => {
    const token = await createUserAndGetToken();

    const res = await request(app)
      .put("/api/notes/64a1b2c3d4e5f6a7b8c9d0e1")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Ghost" });

    expect(res.status).to.equal(404);
    expect(res.body.success).to.be.false;
  });

  // ── Ownership ─────────────────────────────────────────────────────────────────
  it("should return 404 when a different user tries to update the note", async () => {
    const tokenOwner = await createUserAndGetToken();
    const tokenAttacker = await createUserAndGetToken();

    const created = await postNote(tokenOwner);
    const noteId = created.body.note._id;

    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenAttacker}`)
      .send({ title: "Hijacked" });

    expect(res.status).to.equal(404);
  });

  // ── Auth guard ────────────────────────────────────────────────────────────────
  it("should return 401 when no token is provided", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .send({ title: "No auth" });

    expect(res.status).to.equal(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/notes/:id
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/notes/:id", () => {
  // ── Happy path ───────────────────────────────────────────────────────────────
  it("should delete the note and return 200 with success flag", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
  });

  it("should return a success message", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.message).to.match(/deleted successfully/i);
  });

  it("should make the note unreachable via GET after deletion", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`);

    const getRes = await request(app)
      .get(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.status).to.equal(404);
  });

  it("should decrement the note count returned by GET /api/notes", async () => {
    const token = await createUserAndGetToken();
    await postNote(token, { title: "Keep", content: "a" });
    const toDelete = await postNote(token, { title: "Delete me", content: "b" });
    const noteId = toDelete.body.note._id;

    await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`);

    const listRes = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.body.total).to.equal(1);
    expect(listRes.body.notes[0].title).to.equal("Keep");
  });

  // ── Not found / invalid ID ────────────────────────────────────────────────────
  it("should return 404 for a valid ObjectId that does not exist", async () => {
    const token = await createUserAndGetToken();

    const res = await request(app)
      .delete("/api/notes/64a1b2c3d4e5f6a7b8c9d0e1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(404);
    expect(res.body.success).to.be.false;
  });

  it("should return 400 for a malformed note id", async () => {
    const token = await createUserAndGetToken();

    const res = await request(app)
      .delete("/api/notes/not-a-valid-id")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(400);
    expect(res.body.success).to.be.false;
  });

  // ── Ownership ─────────────────────────────────────────────────────────────────
  it("should return 404 when a different user tries to delete the note", async () => {
    const tokenOwner = await createUserAndGetToken();
    const tokenAttacker = await createUserAndGetToken();

    const created = await postNote(tokenOwner);
    const noteId = created.body.note._id;

    const res = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenAttacker}`);

    expect(res.status).to.equal(404);
  });

  it("should NOT delete the note when a different user attempts deletion", async () => {
    const tokenOwner = await createUserAndGetToken();
    const tokenAttacker = await createUserAndGetToken();

    const created = await postNote(tokenOwner);
    const noteId = created.body.note._id;

    // Attacker tries and fails
    await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenAttacker}`);

    // Owner can still retrieve it
    const getRes = await request(app)
      .get(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenOwner}`);

    expect(getRes.status).to.equal(200);
  });

  // ── Auth guard ────────────────────────────────────────────────────────────────
  it("should return 401 when no token is provided", async () => {
    const token = await createUserAndGetToken();
    const created = await postNote(token);
    const noteId = created.body.note._id;

    const res = await request(app).delete(`/api/notes/${noteId}`);

    expect(res.status).to.equal(401);
  });
});
