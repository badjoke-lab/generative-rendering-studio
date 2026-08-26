import { describe, expect, it } from "vitest";
import { createEmptyProject, PROJECT_SCHEMA_VERSION } from "./index";

describe("project document", () => {
  it("creates a deterministic brand-neutral empty document", () => {
    const project = createEmptyProject(42);
    expect(project).toEqual({
      schemaVersion: PROJECT_SCHEMA_VERSION,
      seed: 42,
      sources: [],
      renders: [],
    });
    expect(JSON.stringify(project)).not.toMatch(/GRS|Generative Rendering Studio/i);
  });
});
