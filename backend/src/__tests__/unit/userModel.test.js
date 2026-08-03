import { connectTestDB, clearTestDB, closeTestDB } from "../helpers/db.js";
import User from "../../models/User.js";

process.env.JWT_SECRET = "test_secret_key";

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

describe("User Model", () => {
  describe("password hashing", () => {
    it("should hash the password before saving", async () => {
      const user = await User.create({
        name: "John Doe",
        email: "john@example.com",
        password: "plainPassword123",
      });

      // Fetch with password field included
      const savedUser = await User.findById(user._id).select("+password");

      expect(savedUser.password).not.toBe("plainPassword123");
      expect(savedUser.password).toMatch(/^\$2[ab]\$/); // bcrypt hash pattern
    });

    it("should not re-hash the password if it was not modified", async () => {
      const user = await User.create({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "securePassword123",
      });

      const savedUser = await User.findById(user._id).select("+password");
      const originalHash = savedUser.password;

      // Update a non-password field
      savedUser.name = "Jane Smith";
      await savedUser.save();

      const updatedUser = await User.findById(user._id).select("+password");
      expect(updatedUser.password).toBe(originalHash);
    });
  });

  describe("comparePassword", () => {
    it("should return true for a correct password", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "correctPassword",
      });

      const savedUser = await User.findById(user._id).select("+password");
      const isMatch = await savedUser.comparePassword("correctPassword");

      expect(isMatch).toBe(true);
    });

    it("should return false for an incorrect password", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test2@example.com",
        password: "correctPassword",
      });

      const savedUser = await User.findById(user._id).select("+password");
      const isMatch = await savedUser.comparePassword("wrongPassword");

      expect(isMatch).toBe(false);
    });
  });

  describe("schema validation", () => {
    it("should require name, email, and password", async () => {
      const user = new User({});
      let error;

      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    it("should not allow duplicate emails", async () => {
      await User.create({
        name: "User One",
        email: "duplicate@example.com",
        password: "password123",
      });

      let error;
      try {
        await User.create({
          name: "User Two",
          email: "duplicate@example.com",
          password: "password456",
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error
    });

    it("should not return password by default", async () => {
      const user = await User.create({
        name: "Hidden Pass",
        email: "hidden@example.com",
        password: "secret",
      });

      const found = await User.findById(user._id);
      expect(found.password).toBeUndefined();
    });
  });
});
