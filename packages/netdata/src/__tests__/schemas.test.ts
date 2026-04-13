import { describe, it, expect } from "vitest";
import {
  GetCpuUsageInput,
  GetChartDataInput,
  GetDiskIoInput,
} from "../lib/schemas.js";

describe("Netdata MCP schemas", () => {
  it("GetCpuUsageInput accepts valid input with defaults", () => {
    const parsed = GetCpuUsageInput.parse({ period_seconds: 120 });
    expect(parsed.period_seconds).toBe(120);
  });

  it("GetCpuUsageInput accepts empty input", () => {
    expect(() => GetCpuUsageInput.parse({})).not.toThrow();
  });

  it("GetCpuUsageInput rejects out-of-range values", () => {
    expect(() => GetCpuUsageInput.parse({ period_seconds: 0 })).toThrow();
    expect(() => GetCpuUsageInput.parse({ period_seconds: 1_000_000 })).toThrow();
  });

  it("GetChartDataInput requires chart field", () => {
    expect(() => GetChartDataInput.parse({})).toThrow();
    expect(() => GetChartDataInput.parse({ chart: "system.cpu" })).not.toThrow();
  });

  it("GetDiskIoInput accepts an optional device filter", () => {
    const parsed = GetDiskIoInput.parse({ device: "sda" });
    expect(parsed.device).toBe("sda");
  });
});
