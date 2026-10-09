import { describe, expect, it } from "vitest";
import { broadcastName, isAlreadySubscribedError } from "./resend";

describe("isAlreadySubscribedError", () => {
  it("detects duplicate-contact messages", () => {
    expect(isAlreadySubscribedError(new Error("Contact already exists"))).toBe(true);
  });

  it("detects duplicate-contact status text", () => {
    expect(isAlreadySubscribedError({ name: "validation_error", message: "Invalid request", statusCode: 422 })).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isAlreadySubscribedError(new Error("API key is invalid"))).toBe(false);
  });
});

describe("broadcastName", () => {
  it("keeps Resend broadcast names within its 70-character limit", () => {
    expect(broadcastName("a".repeat(100))).toHaveLength(70);
  });
});
