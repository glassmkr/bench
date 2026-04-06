#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLogger, executeConfirmation } from "@glassmkr/bench-shared";

import {
  GetPowerStatusInput,
  GetSensorReadingsInput,
  GetEventLogInput,
  GetBmcInfoInput,
  GetBootDeviceInput,
  GetChassisStatusInput,
  GetLanInfoInput,
  GetSolInfoInput,
  PowerControlInput,
  SetBootDeviceInput,
  ClearEventLogInput,
  ConfirmActionInput,
} from "./lib/schemas.js";
import { IpmiClient } from "./lib/client.js";
import { getPowerStatus } from "./tools/power.js";
import { getSensorReadings } from "./tools/sensors.js";
import { getEventLog } from "./tools/sel.js";
import { getBmcInfo, getChassisStatus, getBootDevice, getLanInfo, getSolInfo } from "./tools/info.js";
import { powerControl, setBootDevice, clearEventLog } from "./tools/write.js";

const log = createLogger("bench-ipmi");

const host = process.env.IPMI_HOST;
const user = process.env.IPMI_USER;
const pass = process.env.IPMI_PASS;

if (!host || !user || !pass) {
  log.error("Required environment variables: IPMI_HOST, IPMI_USER, IPMI_PASS");
  log.error("Example: IPMI_HOST=10.0.0.1 IPMI_USER=admin IPMI_PASS=secret");
  process.exit(1);
}

const client = new IpmiClient({
  host,
  user,
  pass,
  iface: process.env.IPMI_INTERFACE ?? "lanplus",
  timeoutMs: Number(process.env.IPMI_TIMEOUT_MS) || 10000,
});

const server = new McpServer({
  name: "@glassmkr/bench-ipmi",
  version: "0.1.0",
});

function wrapHandler(fn: (input: Record<string, unknown>) => Promise<unknown>) {
  return async (input: Record<string, unknown>) => {
    try {
      const result = await fn(input);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : String(err);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(err && typeof err === "object" && "error" in err ? err : { error: true, message }, null, 2) }],
        isError: true,
      };
    }
  };
}

// === READ tools (8) ===

server.tool(
  "get_power_status",
  "Current power state of the server (on/off).",
  GetPowerStatusInput.shape,
  wrapHandler(() => getPowerStatus(client))
);

server.tool(
  "get_sensor_readings",
  "BMC sensor data: temperatures, fan speeds, voltages, power draw.",
  GetSensorReadingsInput.shape,
  wrapHandler((input) => getSensorReadings(client, input as { sensor_type?: "temperature" | "fan" | "voltage" | "power" | "all" }))
);

server.tool(
  "get_event_log",
  "System Event Log (SEL) entries. Hardware events, errors, state changes.",
  GetEventLogInput.shape,
  wrapHandler((input) => getEventLog(client, input as { last_n?: number }))
);

server.tool(
  "get_bmc_info",
  "BMC firmware version, manufacturer, product info.",
  GetBmcInfoInput.shape,
  wrapHandler(() => getBmcInfo(client))
);

server.tool(
  "get_boot_device",
  "Current boot device setting and whether it is persistent.",
  GetBootDeviceInput.shape,
  wrapHandler(() => getBootDevice(client))
);

server.tool(
  "get_chassis_status",
  "Full chassis status: power state, last power event, intrusion, faults.",
  GetChassisStatusInput.shape,
  wrapHandler(() => getChassisStatus(client))
);

server.tool(
  "get_lan_info",
  "BMC network configuration: IP, subnet, gateway, MAC address.",
  GetLanInfoInput.shape,
  wrapHandler((input) => getLanInfo(client, (input as { channel?: number }).channel ?? 1))
);

server.tool(
  "get_sol_info",
  "Serial Over LAN configuration and status.",
  GetSolInfoInput.shape,
  wrapHandler(() => getSolInfo(client))
);

// === WRITE tools (3 + confirm_action) ===

server.tool(
  "power_control",
  "Power on, off, cycle, reset, or soft shutdown. Requires confirmation.",
  PowerControlInput.shape,
  wrapHandler((input) => {
    const result = powerControl(client, (input as { action: string }).action);
    return Promise.resolve(result);
  })
);

server.tool(
  "set_boot_device",
  "Change next boot device (pxe, disk, bios, cdrom). Requires confirmation.",
  SetBootDeviceInput.shape,
  wrapHandler((input) => {
    const { device, persistent } = input as { device: string; persistent?: boolean };
    const result = setBootDevice(client, device, persistent ?? false);
    return Promise.resolve(result);
  })
);

server.tool(
  "clear_event_log",
  "Clear the System Event Log. Requires confirmation.",
  ClearEventLogInput.shape,
  wrapHandler(() => {
    const result = clearEventLog(client);
    return Promise.resolve(result);
  })
);

server.tool(
  "confirm_action",
  "Execute a previously requested write operation using its confirmation token.",
  ConfirmActionInput.shape,
  wrapHandler(async (input) => {
    const { token } = input as { token: string };
    const result = await executeConfirmation(token);
    return result;
  })
);

// Start
async function main() {
  log.info(`Starting bench-ipmi, target BMC at ${host}`);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("MCP server running on stdio");
}

main().catch((err) => {
  log.error("Fatal error:", err);
  process.exit(1);
});
