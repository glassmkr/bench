import { describe, it, expect } from "vitest";
import {
  GetSensorReadingsInput,
  GetEventLogInput,
  PowerControlInput,
  SetBootDeviceInput,
  ConfirmActionInput,
  GetLanInfoInput,
} from "../lib/schemas.js";

describe("IPMI schemas", () => {
  it("GetSensorReadingsInput accepts all sensor types", () => {
    for (const t of ["temperature", "fan", "voltage", "power", "all"]) {
      expect(() => GetSensorReadingsInput.parse({ sensor_type: t })).not.toThrow();
    }
  });
  it("GetSensorReadingsInput rejects unknown sensor types", () => {
    expect(() => GetSensorReadingsInput.parse({ sensor_type: "magic" })).toThrow();
  });
  it("GetEventLogInput clamps/validates last_n", () => {
    expect(() => GetEventLogInput.parse({ last_n: 0 })).toThrow();
    expect(() => GetEventLogInput.parse({ last_n: 200 })).toThrow();
    expect(() => GetEventLogInput.parse({ last_n: 50 })).not.toThrow();
  });
  it("PowerControlInput requires action and rejects invalid actions", () => {
    expect(() => PowerControlInput.parse({})).toThrow();
    expect(() => PowerControlInput.parse({ action: "off" })).not.toThrow();
    expect(() => PowerControlInput.parse({ action: "explode" })).toThrow();
  });
  it("SetBootDeviceInput requires device", () => {
    expect(() => SetBootDeviceInput.parse({})).toThrow();
    expect(() => SetBootDeviceInput.parse({ device: "pxe" })).not.toThrow();
  });
  it("ConfirmActionInput requires token string", () => {
    expect(() => ConfirmActionInput.parse({})).toThrow();
    expect(() => ConfirmActionInput.parse({ token: "abc" })).not.toThrow();
  });
  it("GetLanInfoInput rejects out-of-range channel", () => {
    expect(() => GetLanInfoInput.parse({ channel: 16 })).toThrow();
  });
});
