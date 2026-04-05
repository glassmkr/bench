import { NetdataClient } from "../lib/client.js";

export async function getServerOverview(client: NetdataClient) {
  const info = await client.getInfo();

  return {
    hostname: info.hostname ?? "unknown",
    os: `${info.os_name ?? "unknown"} ${info.os_version ?? ""}`.trim(),
    kernel: info.kernel_name ?? "unknown",
    architecture: info.architecture ?? "unknown",
    cpu_count: info.cores_total ?? 0,
    ram_total_mb: Math.round((info.ram_total ?? 0) / 1024 / 1024),
    netdata_version: info.netdata_version ?? "unknown",
    uptime_seconds: info.uptime ?? 0,
  };
}
