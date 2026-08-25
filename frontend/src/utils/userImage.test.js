import { getUserImage } from "./userImage";

describe("getUserImage", () => {
  describe("null / undefined user", () => {
    it("returns empty string for null", () => {
      expect(getUserImage(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(getUserImage(undefined)).toBe("");
    });

    it("returns empty string for an empty object", () => {
      expect(getUserImage({})).toBe("");
    });
  });

  describe("field priority", () => {
    it("returns avatarUrl when present", () => {
      expect(getUserImage({ avatarUrl: "https://cdn.example.com/a.jpg" })).toBe(
        "https://cdn.example.com/a.jpg"
      );
    });

    it("returns avatar when avatarUrl is absent", () => {
      expect(getUserImage({ avatar: "https://cdn.example.com/b.jpg" })).toBe(
        "https://cdn.example.com/b.jpg"
      );
    });

    it("returns profileImage when avatarUrl and avatar are absent", () => {
      expect(getUserImage({ profileImage: "https://cdn.example.com/c.jpg" })).toBe(
        "https://cdn.example.com/c.jpg"
      );
    });

    it("returns profileImageUrl when earlier fields are absent", () => {
      expect(
        getUserImage({ profileImageUrl: "https://cdn.example.com/d.jpg" })
      ).toBe("https://cdn.example.com/d.jpg");
    });

    it("returns imageUrl when earlier fields are absent", () => {
      expect(getUserImage({ imageUrl: "https://cdn.example.com/e.jpg" })).toBe(
        "https://cdn.example.com/e.jpg"
      );
    });

    it("returns image when earlier fields are absent", () => {
      expect(getUserImage({ image: "https://cdn.example.com/f.jpg" })).toBe(
        "https://cdn.example.com/f.jpg"
      );
    });

    it("returns photoUrl when earlier fields are absent", () => {
      expect(getUserImage({ photoUrl: "https://cdn.example.com/g.jpg" })).toBe(
        "https://cdn.example.com/g.jpg"
      );
    });

    it("returns photo when all other fields are absent", () => {
      expect(getUserImage({ photo: "https://cdn.example.com/h.jpg" })).toBe(
        "https://cdn.example.com/h.jpg"
      );
    });

    it("returns empty string when all image fields are absent", () => {
      expect(getUserImage({ name: "Test", email: "t@t.com" })).toBe("");
    });
  });

  describe("priority ordering", () => {
    it("prefers avatarUrl over all other fields", () => {
      const user = {
        avatarUrl: "first",
        avatar: "second",
        profileImage: "third",
        photo: "last",
      };
      expect(getUserImage(user)).toBe("first");
    });

    it("prefers avatar over profileImage when avatarUrl is absent", () => {
      const user = { avatar: "preferred", profileImage: "fallback" };
      expect(getUserImage(user)).toBe("preferred");
    });

    it("skips empty string values and uses the next field", () => {
      // Empty string is falsy — should fall through to next field
      const user = { avatarUrl: "", avatar: "fallback-avatar" };
      expect(getUserImage(user)).toBe("fallback-avatar");
    });
  });
});
