import { ProxmoxClient } from "../lib/client.js";

interface NodeEntry {
  node: string;
  status: string;
  cpu?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
  uptime?: number;
  ssl_fingerprint?: string;
  level?: string;
  [key: string]: unknown;
}

export async function listNodes(client: ProxmoxClient) {
  const nodes = await client.get<NodeEntry[]>("/nodes");

  return {
    count: nodes.length,
    nodes: nodes.map((n) => ({
      node: n.node,
      status: n.status,
      cpu_percent: n.cpu != null ? Math.round(n.cpu * 10000) / 100 : 0,
      maxcpu: n.maxcpu ?? 0,
      mem_used_mb: n.mem != null ? Math.round(n.mem / 1024 / 1024) : 0,
      mem_total_mb: n.maxmem != null ? Math.round(n.maxmem / 1024 / 1024) : 0,
      disk_used_gb: n.disk != null ? Math.round(n.disk / 1024 / 1024 / 1024 * 100) / 100 : 0,
      disk_total_gb: n.maxdisk != null ? Math.round(n.maxdisk / 1024 / 1024 / 1024 * 100) / 100 : 0,
      uptime_seconds: n.uptime ?? 0,
    })),
  };
}
