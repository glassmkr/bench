import { IpmiClient, parseSensorReadings, type SensorReading } from "../lib/client.js";
import type { z } from "zod";
import type { GetSensorReadingsInput } from "../lib/schemas.js";

const TYPE_KEYWORDS: Record<string, string[]> = {
  temperature: ["temp", "temperature"],
  fan: ["fan"],
  voltage: ["volt", "voltage", "vcc", "vdd", "vbat"],
  power: ["power", "watt", "pwr"],
};

export async function getSensorReadings(
  client: IpmiClient,
  input: z.infer<typeof GetSensorReadingsInput>
) {
  const raw = await client.exec("sdr", ["type", "list"]);
  // Fallback: get full sensor list
  const sensorRaw = await client.exec("sensor");
  let sensors = parseSensorReadings(sensorRaw);

  const filterType = input.sensor_type ?? "all";
  if (filterType !== "all") {
    const keywords = TYPE_KEYWORDS[filterType] ?? [];
    sensors = sensors.filter((s) => {
      const lower = (s.name + " " + s.unit).toLowerCase();
      return keywords.some((kw) => lower.includes(kw));
    });
  }

  return {
    count: sensors.length,
    host: client.host,
    sensors: sensors.map((s) => ({
      name: s.name,
      value: s.value,
      unit: s.unit,
      status: s.status,
      lower_critical: s.lower_critical,
      upper_critical: s.upper_critical,
    })),
  };
}
