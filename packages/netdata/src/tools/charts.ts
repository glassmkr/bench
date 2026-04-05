import { NetdataClient } from "../lib/client.js";
import type { z } from "zod";
import type { GetChartDataInput, ListChartsInput } from "../lib/schemas.js";

export async function getChartData(
  client: NetdataClient,
  input: z.infer<typeof GetChartDataInput>
) {
  const data = await client.getChartData(input.chart, {
    after: input.after,
    before: input.before,
    points: input.points ?? 60,
  });

  return {
    chart: input.chart,
    labels: data.labels,
    points: data.data.length,
    data: data.data,
  };
}

export async function listCharts(
  client: NetdataClient,
  input: z.infer<typeof ListChartsInput>
) {
  const charts = await client.getCharts(input.filter);
  return {
    count: charts.length,
    charts: charts.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      family: c.family,
      title: c.title,
      units: c.units,
    })),
  };
}
