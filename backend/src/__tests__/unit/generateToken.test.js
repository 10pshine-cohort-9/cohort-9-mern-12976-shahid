import jwt from "jsonwebtoken";
import generateToken from "../../utils/generateToken.js";

// Set a known secret so we can verify the output
process.env.JWT_SECRET = "test_secret_key";
process.env.JWT_EXPIRES_IN = "7d";

describe("generateToken", () => {
  it("should return a valid JWT string", () => {
    const token = generateToken("user123");

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature
  });

  it("should encode the correct user id in the payload", () => {
    const userId = "64a1b2c3d4e5f6a7b8c9d0e1";
    const token = generateToken(userId);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded.id).toBe(userId);
  });

  it("should use the JWT_EXPIRES_IN env variable for expiry", () => {
    process.env.JWT_EXPIRES_IN = "1d";
    const token = generateToken("user123");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // exp should be roughly 1 day from now (within a 5 second window)
    const oneDayFromNow = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    expect(decoded.exp).toBeCloseTo(oneDayFromNow, -2);
  });

  it("should default to 7d expiry when JWT_EXPIRES_IN is not set", () => {
    delete process.env.JWT_EXPIRES_IN;
    const token = generateToken("user123");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const sevenDaysFromNow = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
    expect(decoded.exp).toBeCloseTo(sevenDaysFromNow, -2);
  });
});
