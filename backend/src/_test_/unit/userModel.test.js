/**
 * Unit tests for src/models/User.js
 *
 * Covers:
 *  - Schema validation (required fields, unique email, minlength)
 *  - Password hashing pre-save hook (bcrypt)
 *  - Password NOT re-hashed when unmodified
 *  - comparePassword() instance method
 *  - password field excluded from default queries (select: false)
 *  - avatarUrl / avatarPublicId defaults
 */

import { expect } from "chai";
import { connectTestDB, clearTestDB, closeTestDB } from "../helpers/db.js";
import User from "../../models/User.js";

// DB lifecycle is managed by mocha.setup.js root hooks — no local before/after needed

describe("User Model", () => {
  // ── Schema validation ────────────────────────────────────────────────────────
  describe("schema validation", () => {
    it("should save a valid user document successfully", async () => {
      const user = await User.create({
        name: "Alice",
        email: "alice@example.com",
        password: "secret123",
      });

      expect(user._id).to.exist;
      expect(user.name).to.equal("Alice");
      expect(user.email).to.equal("alice@example.com");
    });

    it("should require `name`", async () => {
      let err;
      try {
        await User.create({ email: "x@x.com", password: "pass123" });
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
      expect(err.errors).to.have.property("name");
    });

    it("should require `email`", async () => {
      let err;
      try {
        await User.create({ name: "Bob", password: "pass123" });
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
      expect(err.errors).to.have.property("email");
    });

    it("should require `password`", async () => {
      let err;
      try {
        await User.create({ name: "Bob", email: "bob@example.com" });
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
      expect(err.errors).to.have.property("password");
    });

    it("should enforce a minimum password length of 6 characters", async () => {
      let err;
      try {
        await User.create({
          name: "Bob",
          email: "bob@example.com",
          password: "abc",
        });
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
    });

    it("should enforce uniqueness on `email`", async () => {
      await User.create({
        name: "User One",
        email: "dup@example.com",
        password: "password123",
      });

      let err;
      try {
        await User.create({
          name: "User Two",
          email: "dup@example.com",
          password: "password456",
        });
      } catch (e) {
        err = e;
      }

      expect(err).to.exist;
      expect(err.code).to.equal(11000); // MongoDB duplicate-key error
    });

    it("should normalise email to lowercase", async () => {
      const user = await User.create({
        name: "Case Test",
        email: "UPPER@Example.COM",
        password: "password123",
      });
      expect(user.email).to.equal("upper@example.com");
    });

    it("should set avatarUrl and avatarPublicId to empty string by default", async () => {
      const user = await User.create({
        name: "Default Avatar",
        email: "avatar@example.com",
        password: "password123",
      });
      expect(user.avatarUrl).to.equal("");
      expect(user.avatarPublicId).to.equal("");
    });

    it("should add createdAt and updatedAt timestamps", async () => {
      const user = await User.create({
        name: "Timestamped",
        email: "ts@example.com",
        password: "password123",
      });
      expect(user.createdAt).to.be.instanceOf(Date);
      expect(user.updatedAt).to.be.instanceOf(Date);
    });
  });

  // ── Password hashing ─────────────────────────────────────────────────────────
  describe("password hashing (pre-save hook)", () => {
    it("should hash the password before persisting", async () => {
      const plainPassword = "plainPassword123";
      await User.create({
        name: "Hash Test",
        email: "hash@example.com",
        password: plainPassword,
      });

      const saved = await User.findOne({ email: "hash@example.com" }).select(
        "+password"
      );

      expect(saved.password).to.not.equal(plainPassword);
      // bcrypt hashes always start with $2b$ or $2a$
      expect(saved.password).to.match(/^\$2[ab]\$/);
    });

    it("should NOT re-hash the password when an unrelated field is updated", async () => {
      const user = await User.create({
        name: "No Rehash",
        email: "norehash@example.com",
        password: "originalPassword",
      });

      const saved = await User.findById(user._id).select("+password");
      const originalHash = saved.password;

      saved.name = "Updated Name";
      await saved.save();

      const updated = await User.findById(user._id).select("+password");
      expect(updated.password).to.equal(originalHash);
    });

    it("should produce a new hash when the password is explicitly changed", async () => {
      await User.create({
        name: "Rehash Test",
        email: "rehash@example.com",
        password: "firstPassword",
      });

      const saved = await User.findOne({ email: "rehash@example.com" }).select(
        "+password"
      );
      const firstHash = saved.password;

      saved.password = "secondPassword";
      await saved.save();

      const updated = await User.findOne({ email: "rehash@example.com" }).select(
        "+password"
      );
      expect(updated.password).to.not.equal(firstHash);
    });
  });

  // ── comparePassword() ────────────────────────────────────────────────────────
  describe("comparePassword()", () => {
    it("should return true when the correct password is supplied", async () => {
      await User.create({
        name: "Compare Test",
        email: "compare@example.com",
        password: "correctPassword",
      });

      const user = await User.findOne({ email: "compare@example.com" }).select(
        "+password"
      );
      const result = await user.comparePassword("correctPassword");
      expect(result).to.be.true;
    });

    it("should return false when an incorrect password is supplied", async () => {
      await User.create({
        name: "Compare Test 2",
        email: "compare2@example.com",
        password: "correctPassword",
      });

      const user = await User.findOne({ email: "compare2@example.com" }).select(
        "+password"
      );
      const result = await user.comparePassword("wrongPassword");
      expect(result).to.be.false;
    });

    it("should return false for an empty string password", async () => {
      await User.create({
        name: "Empty Pass",
        email: "emptypass@example.com",
        password: "somePassword",
      });

      const user = await User.findOne({ email: "emptypass@example.com" }).select(
        "+password"
      );
      const result = await user.comparePassword("");
      expect(result).to.be.false;
    });
  });

  // ── select: false ────────────────────────────────────────────────────────────
  describe("password field projection", () => {
    it("should NOT include password in a default find query", async () => {
      await User.create({
        name: "Hidden",
        email: "hidden@example.com",
        password: "secret",
      });

      const user = await User.findOne({ email: "hidden@example.com" });
      expect(user.password).to.be.undefined;
    });

    it("should include password when explicitly selected with +password", async () => {
      await User.create({
        name: "Visible",
        email: "visible@example.com",
        password: "secret",
      });

      const user = await User.findOne({ email: "visible@example.com" }).select(
        "+password"
      );
      expect(user.password).to.be.a("string").and.to.have.length.above(0);
    });
  });
});
