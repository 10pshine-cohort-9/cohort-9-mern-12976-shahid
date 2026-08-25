/**
 * Unit tests for src/models/Notes.js
 *
 * Covers:
 *  - Schema validation (required fields: title, content, userId)
 *  - Field types and trimming
 *  - Automatic timestamps (createdAt / updatedAt)
 *  - userId reference integrity (must be a valid ObjectId)
 *  - updatedAt changes on document update
 *  - Multiple notes per user and per-user isolation queries
 */

import { expect } from "chai";
import mongoose from "mongoose";
import { connectTestDB, clearTestDB, closeTestDB } from "../helpers/db.js";
import Note from "../../models/Notes.js";
import User from "../../models/User.js";

// DB lifecycle is managed by mocha.setup.js root hooks — no local before/after needed
// Created fresh for each test via a helper; cleared by afterEach.

async function createTestUser(email = "noteuser@example.com") {
  return User.create({ name: "Note User", email, password: "password123" });
}

// ─────────────────────────────────────────────────────────────────────────────

describe("Note Model", () => {
  // ── Schema validation ────────────────────────────────────────────────────────
  describe("schema validation", () => {
    it("should save a valid note successfully", async () => {
      const user = await createTestUser();
      const note = await Note.create({
        title: "My First Note",
        content: "Hello, world!",
        userId: user._id,
      });

      expect(note._id).to.exist;
      expect(note.title).to.equal("My First Note");
      expect(note.content).to.equal("Hello, world!");
      expect(note.userId.toString()).to.equal(user._id.toString());
    });

    it("should require `title`", async () => {
      const user = await createTestUser();
      let err;
      try {
        await Note.create({ content: "No title", userId: user._id });
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
      expect(err.errors).to.have.property("title");
    });

    it("should require `content`", async () => {
      const user = await createTestUser();
      let err;
      try {
        await Note.create({ title: "No content", userId: user._id });
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
      expect(err.errors).to.have.property("content");
    });

    it("should require `userId`", async () => {
      let err;
      try {
        await Note.create({ title: "No user", content: "Missing userId" });
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
      expect(err.errors).to.have.property("userId");
    });

    it("should reject a non-ObjectId value for `userId`", async () => {
      let err;
      try {
        await Note.create({
          title: "Bad userId",
          content: "Content",
          userId: "not-an-objectid",
        });
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
    });

    it("should trim whitespace from `title`", async () => {
      const user = await createTestUser();
      const note = await Note.create({
        title: "  Padded Title  ",
        content: "Content",
        userId: user._id,
      });
      expect(note.title).to.equal("Padded Title");
    });
  });

  // ── Timestamps ────────────────────────────────────────────────────────────────
  describe("timestamps", () => {
    it("should set createdAt and updatedAt on creation", async () => {
      const user = await createTestUser();
      const note = await Note.create({
        title: "Timestamped",
        content: "Some content",
        userId: user._id,
      });

      expect(note.createdAt).to.be.instanceOf(Date);
      expect(note.updatedAt).to.be.instanceOf(Date);
    });

    it("should update `updatedAt` when the document is modified", async () => {
      const user = await createTestUser();
      const note = await Note.create({
        title: "Before update",
        content: "Original content",
        userId: user._id,
      });

      const originalUpdatedAt = note.updatedAt.getTime();

      // Ensure at least 1 ms passes before the next save
      await new Promise((r) => setTimeout(r, 10));

      note.title = "After update";
      await note.save();

      expect(note.updatedAt.getTime()).to.be.above(originalUpdatedAt);
    });

    it("should NOT change `createdAt` after an update", async () => {
      const user = await createTestUser();
      const note = await Note.create({
        title: "Stable createdAt",
        content: "Content",
        userId: user._id,
      });

      const originalCreatedAt = note.createdAt.getTime();

      await new Promise((r) => setTimeout(r, 10));
      note.content = "Changed content";
      await note.save();

      expect(note.createdAt.getTime()).to.equal(originalCreatedAt);
    });
  });

  // ── Querying ──────────────────────────────────────────────────────────────────
  describe("querying", () => {
    it("should find notes belonging to a specific user", async () => {
      const userA = await createTestUser("a@example.com");
      const userB = await createTestUser("b@example.com");

      await Note.create({ title: "A1", content: "...", userId: userA._id });
      await Note.create({ title: "A2", content: "...", userId: userA._id });
      await Note.create({ title: "B1", content: "...", userId: userB._id });

      const notesA = await Note.find({ userId: userA._id });
      expect(notesA).to.have.lengthOf(2);
      notesA.forEach((n) =>
        expect(n.userId.toString()).to.equal(userA._id.toString())
      );
    });

    it("should return an empty array when a user has no notes", async () => {
      const user = await createTestUser();
      const notes = await Note.find({ userId: user._id });
      expect(notes).to.be.an("array").that.is.empty;
    });

    it("should find a note by _id and userId together (ownership check)", async () => {
      const userA = await createTestUser("owner@example.com");
      const userB = await createTestUser("thief@example.com");

      const note = await Note.create({
        title: "Private",
        content: "Secret",
        userId: userA._id,
      });

      // Owner can find it
      const found = await Note.findOne({ _id: note._id, userId: userA._id });
      expect(found).to.exist;

      // Non-owner cannot find it
      const stolen = await Note.findOne({ _id: note._id, userId: userB._id });
      expect(stolen).to.be.null;
    });

    it("should support case-insensitive regex search on title and content", async () => {
      const user = await createTestUser();
      await Note.create({ title: "JavaScript Tips", content: "Use const.", userId: user._id });
      await Note.create({ title: "Python Guide", content: "Indentation matters.", userId: user._id });
      await Note.create({ title: "Random Note", content: "About javascript basics.", userId: user._id });

      const re = new RegExp("javascript", "i");
      const results = await Note.find({
        userId: user._id,
        $or: [{ title: re }, { content: re }],
      });

      expect(results).to.have.lengthOf(2);
    });
  });

  // ── Deletion ──────────────────────────────────────────────────────────────────
  describe("deletion", () => {
    it("should delete a note and make it unfindable afterwards", async () => {
      const user = await createTestUser();
      const note = await Note.create({
        title: "To be deleted",
        content: "Gone soon",
        userId: user._id,
      });

      await note.deleteOne();
      const found = await Note.findById(note._id);
      expect(found).to.be.null;
    });
  });
});
