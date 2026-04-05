import { NetdataClient } from "../lib/client.js";
import type { z } from "zod";
import type { GetNetworkTrafficInput } from "../lib/schemas.js";

export async function getNetworkTraffic(
  client: NetdataClient,
  input: z.infer<typeof GetNetworkTrafficInput>
) {
  const period = input.period_seconds ?? 60;
  const charts = await client.getCharts("net.");
  const netCharts = charts.filter(
    (c) => c.context === "net.net" || (c.id.startsWith("net.") && c.units === "kilobits/s")
  );

  let filtered = netCharts;
  if (input.interface) {
    filtered = netCharts.filter(
      (c) => c.id === `net.${input.interface}` || c.family === input.interface
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
        interface: chart.family || chart.id.replace("net.", ""),
        received_kbits_per_sec: get("received"),
        sent_kbits_per_sec: get("sent"),
      };
    })
  );
}
