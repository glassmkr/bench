import { ProxmoxClient } from "../lib/client.js";
import type { z } from "zod";
import type { ListResourcesInput, GetClusterStatusInput } from "../lib/schemas.js";

export async function listResources(
  client: ProxmoxClient,
  input: z.infer<typeof ListResourcesInput>
) {
  const type = input.type ?? "all";
  const resources = await client.getResources(type);

  return {
    count: resources.length,
    resources: resources.map((r) => ({
      type: r.type,
      id: `${r.type}/${r.vmid ?? r.name ?? r.id}`,
      name: r.name ?? "",
      node: r.node,
      status: r.status,
      cpu: r.cpu != null ? Math.round(r.cpu * 10000) / 100 : undefined,
      mem: r.mem,
      maxmem: r.maxmem,
      disk: r.disk,
      maxdisk: r.maxdisk,
      vmid: r.vmid,
      uptime: r.uptime,
      tags: r.tags,
    })),
  };
}

export async function getClusterStatus(client: ProxmoxClient) {
  const status = await client.get<Array<{
    type: string;
    name: string;
    online?: number;
    quorate?: number;
    version?: number;
    nodeid?: number;
    ip?: string;
    level?: string;
  }>>("/cluster/status");

  return {
    members: status.map((s) => ({
      type: s.type,
      name: s.name,
      online: s.online === 1,
      quorate: s.quorate === 1,
      version: s.version,
      ip: s.ip,
      level: s.level,
    })),
  };
}
