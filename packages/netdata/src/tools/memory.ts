import { NetdataClient } from "../lib/client.js";

export async function getMemoryUsage(client: NetdataClient) {
  const [ramData, swapData] = await Promise.all([
    client.getChartData("system.ram", { after: -1, points: 1 }),
    client.getChartData("mem.swap", { after: -1, points: 1 }).catch(() => null),
  ]);

  const ramLabels = ramData.labels;
  const ramRow = ramData.data[0] ?? [];

  const getRam = (name: string): number => {
    const idx = ramLabels.indexOf(name);
    return idx >= 0 ? Math.round(ramRow[idx] ?? 0) : 0;
  };

  const used = getRam("used");
  const cached = getRam("cached");
  const buffers = getRam("buffers");
  const free = getRam("free");
  const total = used + cached + buffers + free;
  const percent = total > 0 ? Math.round((used / total) * 10000) / 100 : 0;

  let swapUsed = 0;
  let swapTotal = 0;
  if (swapData) {
    const swapLabels = swapData.labels;
    const swapRow = swapData.data[0] ?? [];
    const getSwap = (name: string): number => {
      const idx = swapLabels.indexOf(name);
      return idx >= 0 ? Math.round(swapRow[idx] ?? 0) : 0;
    };
    swapUsed = getSwap("used");
    const swapFree = getSwap("free");
    swapTotal = swapUsed + swapFree;
  }

  return {
    ram_used_mb: used,
    ram_cached_mb: cached,
    ram_buffers_mb: buffers,
    ram_free_mb: free,
    ram_total_mb: total,
    ram_percent: percent,
    swap_used_mb: swapUsed,
    swap_total_mb: swapTotal,
  };
}
