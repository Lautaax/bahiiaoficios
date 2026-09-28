import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { verifyMercadoPagoSignature } from "../server";
import crypto from "crypto";

describe("verifyMercadoPagoSignature", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("should return true when secret is not configured (fallback mode)", () => {
    delete process.env.MP_WEBHOOK_SECRET;
    delete process.env.MP_SECRET_KEY;

    const req: any = {
      headers: {},
      query: {},
      body: {}
    };

    expect(verifyMercadoPagoSignature(req)).toBe(true);
  });

  it("should return false when secret is configured but x-signature header is missing", () => {
    process.env.MP_WEBHOOK_SECRET = "my_secret_key";

    const req: any = {
      headers: {},
      query: {},
      body: { data: { id: "123456" } }
    };

    expect(verifyMercadoPagoSignature(req)).toBe(false);
  });

  it("should return false when x-signature is invalid/malformed", () => {
    process.env.MP_WEBHOOK_SECRET = "my_secret_key";

    const req: any = {
      headers: {
        "x-signature": "invalid_signature",
        "x-request-id": "req_123"
      },
      query: {},
      body: { data: { id: "123456" } }
    };

    expect(verifyMercadoPagoSignature(req)).toBe(false);
  });

  it("should return false when signature hash does not match computed HMAC", () => {
    process.env.MP_WEBHOOK_SECRET = "my_secret_key";

    const req: any = {
      headers: {
        "x-signature": "ts=1700000000,v1=badhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "x-request-id": "req_123"
      },
      query: { "data.id": "123456" },
      body: {}
    };

    expect(verifyMercadoPagoSignature(req)).toBe(false);
  });

  it("should return true when valid signature and matching HMAC are provided", () => {
    const secret = "my_secret_key";
    process.env.MP_WEBHOOK_SECRET = secret;

    const dataId = "123456";
    const requestId = "req_123";
    const ts = "1700000000";

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1Hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

    const req: any = {
      headers: {
        "x-signature": `ts=${ts},v1=${v1Hash}`,
        "x-request-id": requestId
      },
      query: { "data.id": dataId },
      body: {}
    };

    expect(verifyMercadoPagoSignature(req)).toBe(true);
  });
});
