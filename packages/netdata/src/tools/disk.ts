import { NetdataClient } from "../lib/client.js";
import type { z } from "zod";
import type { GetDiskUsageInput, GetDiskIoInput } from "../lib/schemas.js";

export async function getDiskUsage(
  client: NetdataClient,
  input: z.infer<typeof GetDiskUsageInput>
) {
  const charts = await client.getCharts("disk_space");
  const spaceCharts = charts.filter((c) => c.id.startsWith("disk_space."));

  if (input.mount_point) {
    const normalized = input.mount_point.replace(/\//g, "_").replace(/^_/, "");
    const target = normalized || "_";
    const filtered = spaceCharts.filter(
      (c) => c.id === `disk_space.${target}` || c.family === input.mount_point
    );
    if (filtered.length > 0) {
      return Promise.all(filtered.map((c) => fetchDiskSpace(client, c)));
    }
  }

  return Promise.all(spaceCharts.map((c) => fetchDiskSpace(client, c)));
}

async function fetchDiskSpace(client: NetdataClient, chart: { id: string; family: string; title: string }) {
  const data = await client.getChartData(chart.id, { after: -1, points: 1 });
  const labels = data.labels;
  const row = data.data[0] ?? [];

  const get = (name: string): number => {
    const idx = labels.indexOf(name);
    return idx >= 0 ? Math.round((row[idx] ?? 0) * 100) / 100 : 0;
  };

  const avail = get("avail") / 1024; // MiB to GiB
  const used = get("used") / 1024;
  const reserved = get("reserved_for_root") / 1024;
  const total = avail + used + reserved;

  return {
    mount_point: chart.family || chart.id.replace("disk_space.", "/"),
    total_gb: Math.round(total * 100) / 100,
    used_gb: Math.round(used * 100) / 100,
    available_gb: Math.round(avail * 100) / 100,
    percent_used: total > 0 ? Math.round((used / total) * 10000) / 100 : 0,
  };
}

export async function getDiskIo(
  client: NetdataClient,
  input: z.infer<typeof GetDiskIoInput>
) {
  const period = input.period_seconds ?? 60;
  const charts = await client.getCharts("disk.");
  // Filter to disk I/O charts (disk.sda, disk.sdb, etc.), not disk_space or disk_ops
  const ioCharts = charts.filter(
    (c) => c.context === "disk.io" || (c.id.startsWith("disk.") && c.units === "KiB/s")
  );

  let filtered = ioCharts;
  if (input.device) {
    filtered = ioCharts.filter(
      (c) => c.id === `disk.${input.device}` || c.family === input.device
    );
  }

  return Promise.all(
    filtered.map(async (chart) => {
      const data = await client.getChartData(chart.id, { after: -period, points: 1 });
      const labels = data.labels;
      const row = data.data[0] ?? [];

      const get = (name: string): number => {
        const idx = labels.indexOf(name);
        return idx >= 0 ? Math.round(Math.abs(row[idx] ?? 0) * 100) / 100 : 0;
      };

      return {
        device: chart.family || chart.id.replace("disk.", ""),
        reads_kb_per_sec: get("reads"),
        writes_kb_per_sec: get("writes"),
      };
    })
  );
}
