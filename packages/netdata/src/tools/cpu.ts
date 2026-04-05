import { NetdataClient } from "../lib/client.js";
import type { z } from "zod";
import type { GetCpuUsageInput } from "../lib/schemas.js";

export async function getCpuUsage(
  client: NetdataClient,
  input: z.infer<typeof GetCpuUsageInput>
) {
  const period = input.period_seconds ?? 60;

  // Fetch CPU data and load averages in parallel
  const [cpuData, loadData] = await Promise.all([
    client.getChartData("system.cpu", { after: -period, points: 1 }),
    client.getChartData("system.load", { after: -period, points: 1 }),
  ]);

  // Parse CPU dimensions
  const cpuLabels = cpuData.labels;
  const cpuRow = cpuData.data[0] ?? [];

  const getValue = (name: string): number => {
    const idx = cpuLabels.indexOf(name);
    return idx >= 0 ? Math.round((cpuRow[idx] ?? 0) * 100) / 100 : 0;
  };

  // Parse load averages
  const loadLabels = loadData.labels;
  const loadRow = loadData.data[0] ?? [];

  const getLoad = (name: string): number => {
    const idx = loadLabels.indexOf(name);
    return idx >= 0 ? Math.round((loadRow[idx] ?? 0) * 100) / 100 : 0;
  };

  return {
    period_seconds: period,
    user_percent: getValue("user"),
    system_percent: getValue("system"),
    iowait_percent: getValue("iowait"),
    idle_percent: getValue("idle"),
    nice_percent: getValue("nice"),
    softirq_percent: getValue("softirq"),
    irq_percent: getValue("irq"),
    steal_percent: getValue("steal"),
    load_1m: getLoad("load1"),
    load_5m: getLoad("load5"),
    load_15m: getLoad("load15"),
  };
}
