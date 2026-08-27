import { sanitizeHtml } from "./sanitizeHtml";

// DOMPurify runs against jsdom's real DOM — no mocking needed.
// We test that the function strips dangerous content and preserves safe content.

describe("sanitizeHtml", () => {
  describe("falsy / empty inputs", () => {
    it("returns empty string for null", () => {
      expect(sanitizeHtml(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(sanitizeHtml(undefined)).toBe("");
    });

    it("returns empty string for an empty string", () => {
      expect(sanitizeHtml("")).toBe("");
    });
  });

  describe("allowed tags are preserved", () => {
    it("preserves <p> tags", () => {
      expect(sanitizeHtml("<p>Hello</p>")).toContain("<p>Hello</p>");
    });

    it("preserves <strong> tags", () => {
      expect(sanitizeHtml("<p><strong>Bold</strong></p>")).toContain(
        "<strong>Bold</strong>"
      );
    });

    it("preserves <em> tags", () => {
      expect(sanitizeHtml("<em>italic</em>")).toContain("<em>italic</em>");
    });

    it("preserves <a> tags with href", () => {
      const input = '<a href="https://example.com">link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain("href");
      expect(result).toContain("link");
    });

    it("preserves <ul> and <li> tags", () => {
      const input = "<ul><li>item</li></ul>";
      const result = sanitizeHtml(input);
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>item</li>");
    });

    it("preserves <h1> through <h3> heading tags", () => {
      expect(sanitizeHtml("<h1>Title</h1>")).toContain("Title");
      expect(sanitizeHtml("<h2>Sub</h2>")).toContain("Sub");
      expect(sanitizeHtml("<h3>Sub-sub</h3>")).toContain("Sub-sub");
    });

    it("preserves <img> with src and alt", () => {
      const input = '<img src="https://example.com/img.png" alt="pic">';
      const result = sanitizeHtml(input);
      expect(result).toContain("img");
      expect(result).toContain("src");
    });

    it("preserves data-align attribute on img", () => {
      const input = '<img src="x.png" data-align="center">';
      const result = sanitizeHtml(input);
      expect(result).toContain("data-align");
    });
  });

  describe("dangerous content is stripped", () => {
    it("strips <script> tags (XSS prevention)", () => {
      const input = '<p>safe</p><script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
      expect(result).toContain("safe");
    });

    it("strips inline event handlers like onerror", () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("onerror");
    });

    it("strips javascript: hrefs", () => {
      const input = '<a href="javascript:void(0)">click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("javascript:");
    });

    it("strips <iframe> tags", () => {
      const input = "<iframe src='https://evil.com'></iframe>";
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<iframe");
    });

    it("strips <object> tags", () => {
      const result = sanitizeHtml("<object data='x'></object>");
      expect(result).not.toContain("<object");
    });
  });

  describe("plain text", () => {
    it("returns plain text unchanged (no tags to strip)", () => {
      const result = sanitizeHtml("Hello, world!");
      expect(result).toContain("Hello, world!");
    });
  });
});
