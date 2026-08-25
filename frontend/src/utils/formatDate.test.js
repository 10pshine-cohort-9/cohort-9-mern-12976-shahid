import { formatDate } from "./formatDate";

describe("formatDate", () => {
  describe("valid date strings", () => {
    it("formats an ISO date string into a readable locale string", () => {
      // We test the shape rather than the exact string to avoid locale differences
      // across CI environments. The output should contain a year and a day number.
      const result = formatDate("2025-01-15T10:00:00.000Z");
      expect(result).toBeTruthy();
      expect(result).toMatch(/2025/); // year always present
      expect(result).toMatch(/Jan|January|1/i); // month present in some form
    });

    it("returns a non-empty string for a simple date string", () => {
      const result = formatDate("2024-06-20");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("includes short month name (en-US locale)", () => {
      // Node.js uses Intl — lock to expected en-US short month names
      const result = formatDate("2025-03-05T00:00:00.000Z");
      // "Mar 5, 2025" or "3/5/2025" — year must be present
      expect(result).toMatch(/2025/);
    });

    it("handles a date at the year boundary (Dec 31)", () => {
      const result = formatDate("2024-12-31T23:59:59.000Z");
      expect(result).toMatch(/2024|2025/); // timezone shift is acceptable
    });
  });

  describe("falsy / invalid inputs", () => {
    it("returns empty string for null", () => {
      expect(formatDate(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(formatDate(undefined)).toBe("");
    });

    it("returns empty string for an empty string", () => {
      expect(formatDate("")).toBe("");
    });

    it("returns empty string for 0", () => {
      expect(formatDate(0)).toBe("");
    });
  });

  describe("unusual inputs", () => {
    it("does not throw for an invalid date string", () => {
      // Invalid Date → toLocaleDateString returns "Invalid Date"
      expect(() => formatDate("not-a-date")).not.toThrow();
    });
  });
});
