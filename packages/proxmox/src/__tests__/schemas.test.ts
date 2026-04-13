import { describe, it, expect } from "vitest";
import {
  ListResourcesInput,
  ListVmsInput,
  GetVmInput,
  ListContainersInput,
  GetContainerInput,
} from "../lib/schemas.js";

describe("Proxmox schemas", () => {
  it("ListResourcesInput accepts type filters", () => {
    for (const t of ["vm", "node", "storage", "all"]) {
      expect(() => ListResourcesInput.parse({ type: t })).not.toThrow();
    }
  });
  it("ListVmsInput accepts node + status filters", () => {
    expect(() => ListVmsInput.parse({ node: "pve", status: "running" })).not.toThrow();
    expect(() => ListVmsInput.parse({ status: "halted" })).toThrow();
  });
  it("GetVmInput requires positive vmid", () => {
    expect(() => GetVmInput.parse({})).toThrow();
    expect(() => GetVmInput.parse({ vmid: 0 })).toThrow();
    expect(() => GetVmInput.parse({ vmid: 100 })).not.toThrow();
  });
  it("Container schemas mirror VM schemas", () => {
    expect(() => ListContainersInput.parse({ status: "stopped" })).not.toThrow();
    expect(() => GetContainerInput.parse({ vmid: 200 })).not.toThrow();
  });
});
