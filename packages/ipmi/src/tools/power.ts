import { IpmiClient, parseKeyValueOutput } from "../lib/client.js";

export async function getPowerStatus(client: IpmiClient) {
  const raw = await client.exec("power", ["status"]);
  const lower = raw.toLowerCase().trim();
  let status: "on" | "off" | "unknown" = "unknown";
  if (lower.includes("is on")) status = "on";
  else if (lower.includes("is off")) status = "off";

  return {
    status,
    host: client.host,
    last_checked: new Date().toISOString(),
  };
}
