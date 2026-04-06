import { ProxmoxClient } from "../lib/client.js";
import type { z } from "zod";
import type { ListTasksInput, GetTaskStatusInput, ListSnapshotsInput } from "../lib/schemas.js";

interface TaskEntry {
  upid: string;
  type: string;
  status?: string;
  node: string;
  user: string;
  starttime: number;
  endtime?: number;
  id?: string;
  pstart?: number;
  [key: string]: unknown;
}

export async function listTasks(
  client: ProxmoxClient,
  input: z.infer<typeof ListTasksInput>
) {
  // If node specified, query that node; otherwise get from all nodes
  const nodes: string[] = [];
  if (input.node) {
    nodes.push(input.node);
  } else {
    const nodeList = await client.get<Array<{ node: string }>>("/nodes");
    nodes.push(...nodeList.map((n) => n.node));
  }

  const limit = input.limit ?? 20;
  let allTasks: TaskEntry[] = [];

  for (const node of nodes) {
    const params: Record<string, string> = { limit: String(limit) };
    if (input.vmid) params.vmid = String(input.vmid);
    const tasks = await client.get<TaskEntry[]>(`/nodes/${node}/tasks`, params);
    allTasks.push(...tasks);
  }

  // Sort by start time descending, take limit
  allTasks.sort((a, b) => (b.starttime ?? 0) - (a.starttime ?? 0));
  allTasks = allTasks.slice(0, limit);

  return {
    count: allTasks.length,
    tasks: allTasks.map((t) => ({
      upid: t.upid,
      type: t.type,
      status: t.status ?? "unknown",
      node: t.node,
      user: t.user,
      starttime: t.starttime,
      endtime: t.endtime,
      vmid: t.id ? parseInt(t.id, 10) || undefined : undefined,
    })),
  };
}

export async function getTaskStatus(
  client: ProxmoxClient,
  input: z.infer<typeof GetTaskStatusInput>
) {
  // Extract node from UPID (format: UPID:node:...)
  const parts = input.upid.split(":");
  const node = parts[1];
  if (!node) {
    const { toolError } = await import("@glassmkr/bench-shared");
    throw toolError("INVALID_UPID", "Cannot parse node from UPID string.", { retryable: false });
  }

  const status = await client.get<{
    status: string;
    exitstatus?: string;
    type: string;
    starttime: number;
    endtime?: number;
    node: string;
    user: string;
    pid: number;
  }>(`/nodes/${node}/tasks/${encodeURIComponent(input.upid)}/status`);

  return {
    upid: input.upid,
    status: status.status,
    exitstatus: status.exitstatus,
    type: status.type,
    starttime: status.starttime,
    endtime: status.endtime,
    node: status.node,
    user: status.user,
  };
}

export async function listSnapshots(
  client: ProxmoxClient,
  input: z.infer<typeof ListSnapshotsInput>
) {
  const resolved = await client.resolveVmid(input.vmid);
  const typePath = resolved.type === "qemu" ? "qemu" : "lxc";

  const snapshots = await client.get<Array<{
    name: string;
    description?: string;
    snaptime?: number;
    vmstate?: number;
    parent?: string;
  }>>(`/nodes/${resolved.node}/${typePath}/${input.vmid}/snapshot`);

  // Filter out "current" pseudo-snapshot
  const real = snapshots.filter((s) => s.name !== "current");

  return {
    vmid: input.vmid,
    name: resolved.name,
    node: resolved.node,
    type: resolved.type,
    count: real.length,
    snapshots: real.map((s) => ({
      name: s.name,
      description: s.description ?? "",
      snaptime: s.snaptime,
      vmstate: (s.vmstate ?? 0) === 1,
      parent: s.parent,
    })),
  };
}
