#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLogger } from "@glassmkr/bench-shared";

import {
  GetServerOverviewInput,
  GetCpuUsageInput,
  GetMemoryUsageInput,
  GetDiskUsageInput,
  GetDiskIoInput,
  GetNetworkTrafficInput,
  GetChartDataInput,
  ListChartsInput,
  GetAlarmsInput,
  GetAlarmLogInput,
} from "./lib/schemas.js";
import { NetdataClient } from "./lib/client.js";
import { getServerOverview } from "./tools/overview.js";
import { getCpuUsage } from "./tools/cpu.js";
import { getMemoryUsage } from "./tools/memory.js";
import { getDiskUsage, getDiskIo } from "./tools/disk.js";
import { getNetworkTraffic } from "./tools/network.js";
import { getChartData, listCharts } from "./tools/charts.js";
import { getAlarms, getAlarmLog } from "./tools/alarms.js";

const log = createLogger("bench-netdata");

const url = process.env.NETDATA_URL;
if (!url) {
  log.error("NETDATA_URL environment variable is required.");
  log.error("Example: NETDATA_URL=http://your-server:19999");
  process.exit(1);
}

const client = new NetdataClient(
  url,
  process.env.NETDATA_API_KEY,
  Number(process.env.NETDATA_TIMEOUT_MS) || 5000
);

const server = new McpServer({
  name: "@glassmkr/bench-netdata",
  version: "0.1.0",
});

// Helper to wrap tool handlers with error handling
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

// Register all 10 tools

server.tool(
  "get_server_overview",
  "High-level server snapshot: hostname, OS, uptime, CPU count, total RAM, Netdata version.",
  GetServerOverviewInput.shape,
  wrapHandler(() => getServerOverview(client))
);

server.tool(
  "get_cpu_usage",
  "Current CPU utilization: user, system, iowait, idle percentages and load averages.",
  GetCpuUsageInput.shape,
  wrapHandler((input) => getCpuUsage(client, input as { period_seconds?: number }))
);

server.tool(
  "get_memory_usage",
  "Current RAM and swap usage in MB with percentage.",
  GetMemoryUsageInput.shape,
  wrapHandler(() => getMemoryUsage(client))
);

server.tool(
  "get_disk_usage",
  "Disk space for all mounted filesystems (or a specific mount point).",
  GetDiskUsageInput.shape,
  wrapHandler((input) => getDiskUsage(client, input as { mount_point?: string }))
);

server.tool(
  "get_disk_io",
  "Disk I/O rates (reads/writes per second) for all or a specific device.",
  GetDiskIoInput.shape,
  wrapHandler((input) => getDiskIo(client, input as { device?: string; period_seconds?: number }))
);

server.tool(
  "get_network_traffic",
  "Network interface traffic (received/sent) for all or a specific interface.",
  GetNetworkTrafficInput.shape,
  wrapHandler((input) => getNetworkTraffic(client, input as { interface?: string; period_seconds?: number }))
);

server.tool(
  "get_chart_data",
  "Raw time-series data from any Netdata chart. The power tool: any metric Netdata tracks is accessible.",
  GetChartDataInput.shape,
  wrapHandler((input) => getChartData(client, input as { chart: string; after?: number; before?: number; points?: number }))
);

server.tool(
  "list_charts",
  "Lists all available charts on this Netdata instance, with optional substring filter.",
  ListChartsInput.shape,
  wrapHandler((input) => listCharts(client, input as { filter?: string }))
);

server.tool(
  "get_alarms",
  "Current alarm status: active warnings and criticals.",
  GetAlarmsInput.shape,
  wrapHandler((input) => getAlarms(client, input as { status?: "warning" | "critical" | "all" }))
);

server.tool(
  "get_alarm_log",
  "Recent alarm transitions (alarm history).",
  GetAlarmLogInput.shape,
  wrapHandler((input) => getAlarmLog(client, input as { last_n?: number }))
);

// Start
async function main() {
  log.info(`Starting bench-netdata, connecting to ${url}`);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("MCP server running on stdio");
}

main().catch((err) => {
  log.error("Fatal error:", err);
  process.exit(1);
});
