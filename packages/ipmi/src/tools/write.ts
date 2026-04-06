import { IpmiClient } from "../lib/client.js";
import { requestConfirmation, type ConfirmationRequest } from "@glassmkr/bench-shared";

const ACTION_DESCRIPTIONS: Record<string, { desc: string; reversible: boolean }> = {
  on: { desc: "Power on the server.", reversible: true },
  off: { desc: "Hard power off. All unsaved state will be lost.", reversible: true },
  cycle: { desc: "Hard power cycle. Server will lose all unsaved state and reboot.", reversible: false },
  reset: { desc: "Warm reset. Server will reboot.", reversible: false },
  soft: { desc: "Graceful shutdown via ACPI signal. OS will handle shutdown.", reversible: true },
};

export function powerControl(
  client: IpmiClient,
  action: string
): ConfirmationRequest {
  const info = ACTION_DESCRIPTIONS[action] ?? { desc: `Power action: ${action}`, reversible: false };

  return requestConfirmation(
    `power_${action}`,
    `${client.host} (BMC)`,
    info.desc,
    info.reversible,
    async () => {
      const raw = await client.exec("power", [action]);
      return { success: true, action, message: raw.trim() };
    }
  );
}

const BOOT_DEVICE_MAP: Record<string, string> = {
  pxe: "pxe",
  disk: "disk",
  bios: "bios",
  cdrom: "cdrom",
};

export function setBootDevice(
  client: IpmiClient,
  device: string,
  persistent: boolean
): ConfirmationRequest {
  const persistStr = persistent ? "persistent" : "one-time";
  const ipmiDevice = BOOT_DEVICE_MAP[device] ?? device;

  return requestConfirmation(
    "set_boot_device",
    `${client.host} (BMC)`,
    `Set boot device to ${device} (${persistStr}). Next boot will use this device.`,
    true,
    async () => {
      const args = ["bootdev", ipmiDevice];
      if (persistent) args.push("options=persistent");
      const raw = await client.exec("chassis", args);
      return { success: true, device, persistent, message: raw.trim() };
    }
  );
}

export function clearEventLog(client: IpmiClient): ConfirmationRequest {
  return requestConfirmation(
    "clear_sel",
    `${client.host} (BMC)`,
    "Clear the System Event Log. All historical events will be permanently deleted.",
    false,
    async () => {
      const raw = await client.exec("sel", ["clear"]);
      return { success: true, message: raw.trim() };
    }
  );
}
