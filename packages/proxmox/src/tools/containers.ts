import { ProxmoxClient } from "../lib/client.js";
import type { z } from "zod";
import type { ListContainersInput, GetContainerInput } from "../lib/schemas.js";

export async function listContainers(
  client: ProxmoxClient,
  input: z.infer<typeof ListContainersInput>
) {
  const resources = await client.getResources("vm");
  let cts = resources.filter((r) => r.type === "lxc");

  if (input.node) {
    cts = cts.filter((c) => c.node === input.node);
  }
  if (input.status) {
    cts = cts.filter((c) => c.status === input.status);
  }

  return {
    count: cts.length,
    containers: cts.map((c) => ({
      vmid: c.vmid,
      name: c.name ?? "",
      node: c.node,
      status: c.status,
      type: "lxc",
      cpu_percent: c.cpu != null ? Math.round(c.cpu * 10000) / 100 : 0,
      mem_used_mb: c.mem != null ? Math.round(c.mem / 1024 / 1024) : 0,
      mem_total_mb: c.maxmem != null ? Math.round(c.maxmem / 1024 / 1024) : 0,
      disk_used_gb: c.disk != null ? Math.round(c.disk / 1024 / 1024 / 1024 * 100) / 100 : 0,
      disk_total_gb: c.maxdisk != null ? Math.round(c.maxdisk / 1024 / 1024 / 1024 * 100) / 100 : 0,
      uptime_seconds: c.uptime ?? 0,
      tags: c.tags,
    })),
  };
}

export async function getContainer(
  client: ProxmoxClient,
  input: z.infer<typeof GetContainerInput>
) {
  const resolved = await client.resolveVmid(input.vmid);

  const [config, current] = await Promise.all([
    client.get<Record<string, unknown>>(`/nodes/${resolved.node}/lxc/${input.vmid}/config`),
    client.get<Record<string, unknown>>(`/nodes/${resolved.node}/lxc/${input.vmid}/status/current`),
  ]);

  return {
    vmid: input.vmid,
    name: resolved.name,
    node: resolved.node,
    type: "lxc",
    status: current.status as string,
    config: {
      cores: config.cores,
      memory: config.memory,
      swap: config.swap,
      hostname: config.hostname,
      ostype: config.ostype,
      rootfs: config.rootfs,
      net0: config.net0,
      unprivileged: config.unprivileged,
      tags: config.tags,
    },
    current: {
      status: current.status,
      cpu_percent: current.cpu != null ? Math.round((current.cpu as number) * 10000) / 100 : 0,
      mem_used_mb: current.mem != null ? Math.round((current.mem as number) / 1024 / 1024) : 0,
      mem_total_mb: current.maxmem != null ? Math.round((current.maxmem as number) / 1024 / 1024) : 0,
      disk_used_gb: current.disk != null ? Math.round((current.disk as number) / 1024 / 1024 / 1024 * 100) / 100 : 0,
      uptime_seconds: current.uptime ?? 0,
    },
  };
}
