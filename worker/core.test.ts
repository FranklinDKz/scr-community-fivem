import { describe, expect, it } from "vitest";
import {
  dayInBrazil,
  hashPassword,
  randomSalt,
  resourceSchema,
  verifyPassword,
} from "./core";

describe("core security and business rules", () => {
  it("uses the Fortaleza day boundary", () => {
    expect(dayInBrazil(new Date("2026-10-09T01:30:00.000Z"))).toBe(
      "2026-10-08",
    );
  });

  it("hashes passwords with salt and verifies without storing the password", async () => {
    const salt = randomSalt();
    const hash = await hashPassword("senha-segura-123", salt, "test-pepper");
    expect(hash).not.toContain("senha-segura-123");
    await expect(
      verifyPassword("senha-segura-123", salt, hash, "test-pepper"),
    ).resolves.toBe(true);
    await expect(
      verifyPassword("senha-errada", salt, hash, "test-pepper"),
    ).resolves.toBe(false);
  });

  it("requires a reviewed file before publishing a resource", () => {
    const result = resourceSchema.safeParse({
      title: "Resource real",
      description: "Descrição completa com instruções suficientes.",
      category: "script",
      framework: "Standalone",
      version: "1.0.0",
      exclusive: false,
      published: true,
      reviewed: false,
      author: "Autor",
      license: "MIT",
      media: [],
      fileKey: null,
      filename: null,
    });
    expect(result.success).toBe(false);
  });
});
