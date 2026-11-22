import { describe, expect, it } from "vitest";
import { llmsTxt } from "./llms";

describe("llmsTxt", () => {
  it("documents every endpoint", () => {
    for (const route of [
      "POST /t/<webhook-id> ",
      "GET /t/<webhook-id> ",
      "POST /t/<webhook-id>/map",
      "POST /t/<webhook-id>/file",
      "POST /t/<webhook-id>/photo",
      "POST /t/<webhook-id>/raw",
    ]) {
      expect(llmsTxt).toContain(route);
    }
  });

  it("documents every message field and option", () => {
    for (const field of ["event", "text", "emoji", "channel", "metadata", "notify", "plain", "$json"]) {
      expect(llmsTxt).toContain(field);
    }
  });

  it("starts with a title and uses real shell escapes", () => {
    expect(llmsTxt.startsWith("# Telert\n")).toBe(true);
    expect(llmsTxt).toContain("\\$json.action");
  });
});
