/**
 * Unit tests for src/utils/generateToken.js
 *
 * These tests are pure-unit — no HTTP server, no database.
 * We set the required env vars before importing the module under test.
 */

import { expect } from "chai";
import jwt from "jsonwebtoken";

// JWT env vars are set by mocha.setup.js (loaded via --require before any test)

// Dynamic import so env vars are already in place when the module evaluates
const { default: generateToken } = await import(
  "../../utils/generateToken.js"
);

// ─────────────────────────────────────────────────────────────────────────────

describe("generateToken()", () => {
  // ── Return type ─────────────────────────────────────────────────────────────
  describe("return value", () => {
    it("should return a non-empty string", () => {
      const token = generateToken("507f1f77bcf86cd799439011");
      expect(token).to.be.a("string").and.to.have.length.above(0);
    });

    it("should be a valid three-segment JWT (header.payload.signature)", () => {
      const token = generateToken("507f1f77bcf86cd799439011");
      const parts = token.split(".");
      expect(parts).to.have.lengthOf(3);
    });
  });

  // ── Payload ──────────────────────────────────────────────────────────────────
  describe("JWT payload", () => {
    it("should embed the provided userId as the `id` claim", () => {
      const userId = "507f1f77bcf86cd799439011";
      const token = generateToken(userId);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded).to.have.property("id", userId);
    });

    it("should include standard `iat` (issued-at) and `exp` (expiry) claims", () => {
      const token = generateToken("507f1f77bcf86cd799439011");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded).to.have.property("iat").that.is.a("number");
      expect(decoded).to.have.property("exp").that.is.a("number");
      expect(decoded.exp).to.be.above(decoded.iat);
    });

    it("should produce different tokens for different user IDs", () => {
      const tokenA = generateToken("aaaaaaaaaaaaaaaaaaaaaaaa");
      const tokenB = generateToken("bbbbbbbbbbbbbbbbbbbbbbbb");
      expect(tokenA).to.not.equal(tokenB);
    });
  });

  // ── Expiry ────────────────────────────────────────────────────────────────────
  describe("expiry", () => {
    it("should honour JWT_EXPIRES_IN when set to '1d'", () => {
      process.env.JWT_EXPIRES_IN = "1d";

      // Re-import to pick up the new env value
      // generateToken reads process.env at call-time (no module-level caching),
      // so re-setting env and calling again is sufficient.
      const token = generateToken("507f1f77bcf86cd799439011");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const expectedExp =
        Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 1 day in seconds
      // Allow ±5 s drift for test execution time
      expect(decoded.exp).to.be.within(expectedExp - 5, expectedExp + 5);

      // Restore for subsequent tests
      process.env.JWT_EXPIRES_IN = "7d";
    });

    it("should default to ~7 days expiry when JWT_EXPIRES_IN is not set", () => {
      const saved = process.env.JWT_EXPIRES_IN;
      delete process.env.JWT_EXPIRES_IN;

      const token = generateToken("507f1f77bcf86cd799439011");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const sevenDays = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
      expect(decoded.exp).to.be.within(sevenDays - 5, sevenDays + 5);

      process.env.JWT_EXPIRES_IN = saved;
    });
  });

  // ── Signature ─────────────────────────────────────────────────────────────────
  describe("signature", () => {
    it("should produce a token verifiable with JWT_SECRET", () => {
      const token = generateToken("507f1f77bcf86cd799439011");
      expect(() =>
        jwt.verify(token, process.env.JWT_SECRET)
      ).to.not.throw();
    });

    it("should reject verification with a wrong secret", () => {
      const token = generateToken("507f1f77bcf86cd799439011");
      expect(() =>
        jwt.verify(token, "completely_wrong_secret")
      ).to.throw(jwt.JsonWebTokenError);
    });
  });
});
