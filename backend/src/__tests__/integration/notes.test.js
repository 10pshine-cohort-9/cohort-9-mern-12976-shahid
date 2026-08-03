import request from "supertest";
import app from "../helpers/testApp.js";
import { connectTestDB, clearTestDB, closeTestDB } from "../helpers/db.js";

process.env.JWT_SECRET = "test_secret_key";
process.env.JWT_EXPIRES_IN = "7d";

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

// Register a user and return their auth token
const setupUser = async (email = "user@example.com", password = "password123") => {
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Test User", email, password });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  return res.body.token;
};

// Create a note and return the response
const createNote = (token, data = {}) => {
  const defaults = { title: "Test Note", content: "Test content" };
  return request(app)
    .post("/api/notes")
    .set("Authorization", `Bearer ${token}`)
    .send({ ...defaults, ...data });
};

describe("POST /api/notes", () => {
  it("should create a note for an authenticated user", async () => {
    const token = await setupUser();
    const res = await createNote(token);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.note.title).toBe("Test Note");
    expect(res.body.note.content).toBe("Test content");
  });

  it("should return 400 if title or content is missing", async () => {
    const token = await setupUser();
    const res = await createNote(token, { title: "", content: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 without a token", async () => {
    const res = await request(app)
      .post("/api/notes")
      .send({ title: "Test", content: "Content" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/notes", () => {
  it("should return all notes for the authenticated user", async () => {
    const token = await setupUser();
    await createNote(token, { title: "Note 1", content: "Content 1" });
    await createNote(token, { title: "Note 2", content: "Content 2" });

    const res = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(2);
    expect(res.body.notes).toHaveLength(2);
  });

  it("should only return notes belonging to the authenticated user", async () => {
    const tokenA = await setupUser("userA@example.com");
    const tokenB = await setupUser("userB@example.com");

    await createNote(tokenA, { title: "User A note", content: "Private" });
    await createNote(tokenB, { title: "User B note", content: "Private" });

    const res = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.body.total).toBe(1);
    expect(res.body.notes[0].title).toBe("User A note");
  });

  it("should return 401 without a token", async () => {
    const res = await request(app).get("/api/notes");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/notes/:id", () => {
  it("should return a single note by id", async () => {
    const token = await setupUser();
    const created = await createNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .get(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.note._id).toBe(noteId);
  });

  it("should return 404 for a note that does not exist", async () => {
    const token = await setupUser();

    const res = await request(app)
      .get("/api/notes/64a1b2c3d4e5f6a7b8c9d0e1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("should not allow a user to access another user's note", async () => {
    const tokenA = await setupUser("a@example.com");
    const tokenB = await setupUser("b@example.com");

    const created = await createNote(tokenA);
    const noteId = created.body.note._id;

    const res = await request(app)
      .get(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/notes/:id", () => {
  it("should update a note successfully", async () => {
    const token = await setupUser();
    const created = await createNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated Title", content: "Updated content" });

    expect(res.status).toBe(200);
    expect(res.body.note.title).toBe("Updated Title");
    expect(res.body.note.content).toBe("Updated content");
  });

  it("should return 404 if note does not belong to the user", async () => {
    const tokenA = await setupUser("ownr@example.com");
    const tokenB = await setupUser("other@example.com");

    const created = await createNote(tokenA);
    const noteId = created.body.note._id;

    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ title: "Hacked" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/notes/:id", () => {
  it("should delete a note successfully", async () => {
    const token = await setupUser();
    const created = await createNote(token);
    const noteId = created.body.note._id;

    const res = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 404 if note does not exist", async () => {
    const token = await setupUser();

    const res = await request(app)
      .delete("/api/notes/64a1b2c3d4e5f6a7b8c9d0e1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("should not allow a user to delete another user's note", async () => {
    const tokenA = await setupUser("owner@example.com");
    const tokenB = await setupUser("attacker@example.com");

    const created = await createNote(tokenA);
    const noteId = created.body.note._id;

    const res = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});
