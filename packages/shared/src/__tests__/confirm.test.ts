import { describe, it, expect } from "vitest";
import { requestConfirmation, executeConfirmation } from "../confirm.js";

describe("requestConfirmation", () => {
  it("returns a 48-char hex token and the action metadata", () => {
    const req = requestConfirmation("power_off", "host", "Power off the host", false, async () => "ok");
    expect(req.confirmation_required).toBe(true);
    expect(req.action).toBe("power_off");
    expect(req.target).toBe("host");
    expect(req.reversible).toBe(false);
    expect(req.confirm_token).toMatch(/^[0-9a-f]{48}$/);
    expect(req.expires_in_seconds).toBe(300);
  });
});

describe("executeConfirmation", () => {
  it("runs the executor and returns the result on a valid token", async () => {
    const req = requestConfirmation("noop", "x", "noop", true, async () => ({ ok: 1 }));
    const res = await executeConfirmation(req.confirm_token);
    expect(res.success).toBe(true);
    expect(res.result).toEqual({ ok: 1 });
  });
  it("rejects an unknown token", async () => {
    const res = await executeConfirmation("not-a-real-token");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Invalid");
  });
  it("can only be redeemed once", async () => {
    const req = requestConfirmation("once", "x", "x", true, async () => 1);
    const first = await executeConfirmation(req.confirm_token);
    expect(first.success).toBe(true);
    const second = await executeConfirmation(req.confirm_token);
    expect(second.success).toBe(false);
  });
  it("propagates executor errors as success=false", async () => {
    const req = requestConfirmation("fail", "x", "x", true, async () => { throw new Error("boom"); });
    const res = await executeConfirmation(req.confirm_token);
    expect(res.success).toBe(false);
    expect(res.error).toContain("boom");
  });
});
