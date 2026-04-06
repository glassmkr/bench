import { z } from "zod";

// Read tools
export const GetPowerStatusInput = z.object({});

export const GetSensorReadingsInput = z.object({
  sensor_type: z.enum(["temperature", "fan", "voltage", "power", "all"]).default("all").optional()
    .describe("Filter sensors by type. Default: all."),
});

export const GetEventLogInput = z.object({
  last_n: z.number().min(1).max(100).default(20).optional()
    .describe("Number of recent SEL entries to return. Default: 20."),
});

export const GetBmcInfoInput = z.object({});

export const GetBootDeviceInput = z.object({});

export const GetChassisStatusInput = z.object({});

export const GetLanInfoInput = z.object({
  channel: z.number().min(0).max(15).default(1).optional()
    .describe("LAN channel number. Default: 1."),
});

export const GetSolInfoInput = z.object({});

// Write tools
export const PowerControlInput = z.object({
  action: z.enum(["on", "off", "cycle", "reset", "soft"])
    .describe("Power action: on, off, cycle (hard reset), reset (warm reset), or soft (graceful shutdown)."),
});

export const SetBootDeviceInput = z.object({
  device: z.enum(["pxe", "disk", "bios", "cdrom"])
    .describe("Boot device to set for next boot."),
  persistent: z.boolean().default(false).optional()
    .describe("Make the boot device change persistent across reboots. Default: false (one-time)."),
});

export const ClearEventLogInput = z.object({});

export const ConfirmActionInput = z.object({
  token: z.string()
    .describe("Confirmation token from a previous write operation."),
});
