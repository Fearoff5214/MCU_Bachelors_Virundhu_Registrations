import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.QR_SECRET = "test-secret-test-secret-test-secret-123";
});

describe("QR tokens", async () => {
  const { signTicket, verifyTicketToken, generateTicketCode, normaliseCode } = await import("@/lib/qr");
  const id = "3f6c2a1e-8b4d-4c2a-9e1f-0a1b2c3d4e5f";

  it("round-trips a genuine token", () => {
    expect(verifyTicketToken(signTicket(id))).toBe(id);
  });

  it("rejects a token whose ticket id was swapped", () => {
    const [, mac] = signTicket(id).split(".");
    expect(verifyTicketToken(`4f6c2a1e-8b4d-4c2a-9e1f-0a1b2c3d4e5f.${mac}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signTicket(id);
    const flipped = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyTicketToken(flipped)).toBeNull();
  });

  it("rejects garbage", () => {
    for (const bad of ["", "hello", "a.b.c", `${id}.`, "https://example.com"]) expect(verifyTicketToken(bad)).toBeNull();
  });

  it("rejects tokens signed with a different secret", async () => {
    const token = signTicket(id);
    process.env.QR_SECRET = "another-secret-another-secret-another";
    expect(verifyTicketToken(token)).toBeNull();
    process.env.QR_SECRET = "test-secret-test-secret-test-secret-123";
  });

  it("generates readable codes without ambiguous characters", () => {
    for (let i = 0; i < 500; i++) expect(generateTicketCode()).toMatch(/^BV-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });

  it("normalises hand-typed codes", () => {
    expect(normaliseCode("bv 7k3q 9xpm")).toBe("BV-7K3Q-9XPM");
    expect(normaliseCode("7K3Q-9XPM")).toBe("BV-7K3Q-9XPM");
    expect(normaliseCode("BV-123")).toBeNull();
  });
});
