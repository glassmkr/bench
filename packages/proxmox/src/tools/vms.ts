import { ProxmoxClient } from "../lib/client.js";
import type { z } from "zod";
import type { ListVmsInput, GetVmInput } from "../lib/schemas.js";

export async function listVms(
  client: ProxmoxClient,
  input: z.infer<typeof ListVmsInput>
) {
  const resources = await client.getResources("vm");
  let vms = resources.filter((r) => r.type === "qemu");

  if (input.node) {
    vms = vms.filter((v) => v.node === input.node);
  }
  if (input.status) {
    vms = vms.filter((v) => v.status === input.status);
  }

  return {
    count: vms.length,
    vms: vms.map((v) => ({
      vmid: v.vmid,
      name: v.name ?? "",
      node: v.node,
      status: v.status,
      cpu_percent: v.cpu != null ? Math.round(v.cpu * 10000) / 100 : 0,
      mem_used_mb: v.mem != null ? Math.round(v.mem / 1024 / 1024) : 0,
      mem_total_mb: v.maxmem != null ? Math.round(v.maxmem / 1024 / 1024) : 0,
      disk_used_gb: v.disk != null ? Math.round(v.disk / 1024 / 1024 / 1024 * 100) / 100 : 0,
      disk_total_gb: v.maxdisk != null ? Math.round(v.maxdisk / 1024 / 1024 / 1024 * 100) / 100 : 0,
      uptime_seconds: v.uptime ?? 0,
      tags: v.tags,
    })),
  };
}

export async function getVm(
  client: ProxmoxClient,
  input: z.infer<typeof GetVmInput>
) {
  const resolved = await client.resolveVmid(input.vmid);
  const typePath = resolved.type === "qemu" ? "qemu" : "lxc";

  const [config, current] = await Promise.all([
    client.get<Record<string, unknown>>(`/nodes/${resolved.node}/${typePath}/${input.vmid}/config`),
    client.get<Record<string, unknown>>(`/nodes/${resolved.node}/${typePath}/${input.vmid}/status/current`),
  ]);

  return {
    vmid: input.vmid,
    name: resolved.name,
    node: resolved.node,
    type: resolved.type,
    status: current.status as string,
    config: {
      cores: config.cores,
      memory: config.memory,
      sockets: config.sockets,
      ostype: config.ostype,
      bootdisk: config.bootdisk,
      net0: config.net0,
      scsi0: config.scsi0,
      ide0: config.ide0,
      ide2: config.ide2,
      boot: config.boot,
      agent: config.agent,
      balloon: config.balloon,
      tags: config.tags,
    },
    current: {
      status: current.status,
      cpu_percent: current.cpu != null ? Math.round((current.cpu as number) * 10000) / 100 : 0,
      mem_used_mb: current.mem != null ? Math.round((current.mem as number) / 1024 / 1024) : 0,
      mem_total_mb: current.maxmem != null ? Math.round((current.maxmem as number) / 1024 / 1024) : 0,
      disk_used_gb: current.disk != null ? Math.round((current.disk as number) / 1024 / 1024 / 1024 * 100) / 100 : 0,
      uptime_seconds: current.uptime ?? 0,
      pid: current.pid,
      qmpstatus: current.qmpstatus,
    },
  };
}
