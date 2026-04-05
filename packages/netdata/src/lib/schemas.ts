import { z } from "zod";

export const GetCpuUsageInput = z.object({
  period_seconds: z.number().min(1).max(86400).default(60).optional()
    .describe("Time period in seconds to average over. Default 60."),
});

export const GetMemoryUsageInput = z.object({});

export const GetDiskUsageInput = z.object({
  mount_point: z.string().optional()
    .describe("Filter to a specific mount point, e.g. / or /data"),
});

export const GetDiskIoInput = z.object({
  device: z.string().optional()
    .describe("Filter to a specific device, e.g. sda"),
  period_seconds: z.number().min(1).max(86400).default(60).optional()
    .describe("Time period in seconds to average over. Default 60."),
});

export const GetNetworkTrafficInput = z.object({
  interface: z.string().optional()
    .describe("Filter to a specific network interface, e.g. eth0"),
  period_seconds: z.number().min(1).max(86400).default(60).optional()
    .describe("Time period in seconds to average over. Default 60."),
});

export const GetChartDataInput = z.object({
  chart: z.string()
    .describe("Netdata chart ID, e.g. system.cpu, disk_space._, net.eth0"),
  after: z.number().optional()
    .describe("Start time as negative seconds ago (e.g. -3600 for last hour) or unix timestamp"),
  before: z.number().optional()
    .describe("End time as negative seconds ago or unix timestamp. Default 0 (now)."),
  points: z.number().min(1).max(3600).default(60).optional()
    .describe("Number of data points to return. Default 60."),
});

export const ListChartsInput = z.object({
  filter: z.string().optional()
    .describe("Filter charts by substring match on chart name"),
});

export const GetAlarmsInput = z.object({
  status: z.enum(["warning", "critical", "all"]).default("all").optional()
    .describe("Filter alarms by status"),
});

export const GetAlarmLogInput = z.object({
  last_n: z.number().min(1).max(100).default(20).optional()
    .describe("Number of recent alarm transitions to return"),
});

export const GetServerOverviewInput = z.object({});
