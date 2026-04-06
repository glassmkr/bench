import { IpmiClient, parseSelEntries } from "../lib/client.js";
import type { z } from "zod";
import type { GetEventLogInput } from "../lib/schemas.js";

export async function getEventLog(
  client: IpmiClient,
  input: z.infer<typeof GetEventLogInput>
) {
  const lastN = input.last_n ?? 20;
  const raw = await client.exec("sel", ["list"]);
  let entries = parseSelEntries(raw);

  // Take the last N entries (most recent)
  if (entries.length > lastN) {
    entries = entries.slice(-lastN);
  }

  return {
    count: entries.length,
    total_entries: parseSelCount(await client.exec("sel", ["info"])),
    host: client.host,
    entries: entries.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      sensor: e.sensor,
      event_type: e.event_type,
      description: e.description,
    })),
  };
}

function parseSelCount(infoRaw: string): number {
  const match = infoRaw.match(/Entries\s*:\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}
