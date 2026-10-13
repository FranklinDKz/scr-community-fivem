import { describe, expect, it } from "vitest";
import {
  dayInBrazil,
  hashPassword,
  productSchema,
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

  it("keeps incomplete products as drafts but blocks their publication", () => {
    const incomplete = {
      id: "base-teste",
      title: "Base teste",
      subtitle: "Uma base para testar",
      price: 1000,
      category: "base" as const,
      image: "",
      label: "Multi-framework",
      docs: "",
      video: "",
      features: ["Instalação"],
      description: "Descrição completa do produto que está em preparação.",
      gallery: [],
      discordRoleId: "",
      deliveryUrl: "",
      licenseTicketUrl: "",
      published: false,
      sortOrder: 100,
    };
    expect(productSchema.safeParse(incomplete).success).toBe(true);
    expect(
      productSchema.safeParse({ ...incomplete, published: true }).success,
    ).toBe(false);
  });

  it("accepts a complete published base", () => {
    expect(
      productSchema.safeParse({
        id: "base-completa",
        title: "Base completa",
        subtitle: "Pronta para sua cidade",
        price: 39990,
        category: "base",
        image: "assets/creative-v6-cover.svg",
        label: "Multi-framework",
        docs: "https://docs.example.com/base",
        video: "",
        features: ["Instalador", "Suporte permanente"],
        description: "Descrição completa da base pronta para publicação.",
        gallery: [],
        discordRoleId: "1191845850436083722",
        deliveryUrl: "https://example.com/instalador",
        licenseTicketUrl: "https://discord.gg/exemplo",
        published: true,
        sortOrder: 10,
      }).success,
    ).toBe(true);
  });
});
