import { NetdataClient } from "../lib/client.js";
import type { z } from "zod";
import type { GetAlarmsInput, GetAlarmLogInput } from "../lib/schemas.js";

export async function getAlarms(
  client: NetdataClient,
  input: z.infer<typeof GetAlarmsInput>
) {
  const alarms = await client.getAlarms(input.status ?? "all");
  return {
    count: alarms.length,
    alarms: alarms.map((a) => ({
      chart: a.chart,
      name: a.name,
      status: a.status,
      value: a.value,
      units: a.units,
      last_status_change: a.last_status_change,
      info: a.info,
    })),
  };
}

export async function getAlarmLog(
  client: NetdataClient,
  input: z.infer<typeof GetAlarmLogInput>
) {
  const entries = await client.getAlarmLog(input.last_n ?? 20);
  return {
    count: entries.length,
    entries: entries.map((e) => ({
      chart: e.chart,
      name: e.name,
      old_status: e.old_status,
      new_status: e.new_status,
      value: e.value,
      timestamp: e.timestamp,
      info: e.info,
    })),
  };
}
