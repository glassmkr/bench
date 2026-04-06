#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLogger, executeConfirmation } from "@glassmkr/bench-shared";

import {
  ListResourcesInput, GetClusterStatusInput, ListNodesInput,
  ListVmsInput, GetVmInput, ListContainersInput, GetContainerInput,
  ListStorageInput, ListSnapshotsInput, ListTasksInput, GetTaskStatusInput,
  VmPowerInput, ContainerPowerInput, CreateSnapshotInput, DeleteSnapshotInput,
  ConfirmActionInput,
} from "./lib/schemas.js";
import { ProxmoxClient } from "./lib/client.js";
import { listResources, getClusterStatus } from "./tools/cluster.js";
import { listNodes } from "./tools/nodes.js";
import { listVms, getVm } from "./tools/vms.js";
import { listContainers, getContainer } from "./tools/containers.js";
import { listStorage } from "./tools/storage.js";
import { listSnapshots, listTasks, getTaskStatus } from "./tools/tasks.js";
import { vmPower, containerPower, createSnapshot, deleteSnapshot } from "./tools/write.js";

const log = createLogger("bench-proxmox");

const url = process.env.PROXMOX_URL;
const tokenId = process.env.PROXMOX_TOKEN_ID;
const tokenSecret = process.env.PROXMOX_TOKEN_SECRET;

if (!url || !tokenId || !tokenSecret) {
  log.error("Required: PROXMOX_URL, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET");
  log.error("Example: PROXMOX_URL=https://pve:8006 PROXMOX_TOKEN_ID=user@pve!token PROXMOX_TOKEN_SECRET=uuid");
  process.exit(1);
}

const client = new ProxmoxClient(url, tokenId, tokenSecret, {
  verifySsl: process.env.PROXMOX_VERIFY_SSL === "true",
  timeoutMs: Number(process.env.PROXMOX_TIMEOUT_MS) || 10000,
});

const server = new McpServer({
  name: "@glassmkr/bench-proxmox",
  version: "0.1.0",
});

function wrapHandler(fn: (input: Record<string, unknown>) => Promise<unknown>) {
  return async (input: Record<string, unknown>) => {
    try {
      const result = await fn(input);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : String(err);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(err && typeof err === "object" && "error" in err ? err : { error: true, message }, null, 2) }],
        isError: true,
      };
    }
  };
}

// === READ tools (11) ===

server.tool("list_resources",
  "Overview of all resources in the cluster: VMs, containers, nodes, storage.",
  ListResourcesInput.shape,
  wrapHandler((input) => listResources(client, input as { type?: "vm" | "node" | "storage" | "all" }))
);

server.tool("get_cluster_status",
  "Cluster health: nodes online/offline, quorum status.",
  GetClusterStatusInput.shape,
  wrapHandler(() => getClusterStatus(client))
);

server.tool("list_nodes",
  "All nodes with CPU, memory, disk usage, and uptime.",
  ListNodesInput.shape,
  wrapHandler(() => listNodes(client))
);

server.tool("list_vms",
  "All QEMU VMs with status, resource usage. Optional node/status filter.",
  ListVmsInput.shape,
  wrapHandler((input) => listVms(client, input as { node?: string; status?: "running" | "stopped" }))
);

server.tool("get_vm",
  "Detailed VM info: full config + current resource usage. Node resolved automatically.",
  GetVmInput.shape,
  wrapHandler((input) => getVm(client, input as { vmid: number }))
);

server.tool("list_containers",
  "All LXC containers with status, resource usage. Optional node/status filter.",
  ListContainersInput.shape,
  wrapHandler((input) => listContainers(client, input as { node?: string; status?: "running" | "stopped" }))
);

server.tool("get_container",
  "Detailed container info: full config + current resource usage. Node resolved automatically.",
  GetContainerInput.shape,
  wrapHandler((input) => getContainer(client, input as { vmid: number }))
);

server.tool("list_storage",
  "Storage pools across the cluster with capacity and usage.",
  ListStorageInput.shape,
  wrapHandler((input) => listStorage(client, input as { node?: string }))
);

server.tool("list_snapshots",
  "Snapshots for a VM or container. Node and type resolved automatically.",
  ListSnapshotsInput.shape,
  wrapHandler((input) => listSnapshots(client, input as { vmid: number }))
);

server.tool("list_tasks",
  "Recent cluster tasks: backups, migrations, start/stop operations.",
  ListTasksInput.shape,
  wrapHandler((input) => listTasks(client, input as { node?: string; vmid?: number; limit?: number }))
);

server.tool("get_task_status",
  "Status of a specific task by UPID.",
  GetTaskStatusInput.shape,
  wrapHandler((input) => getTaskStatus(client, input as { upid: string }))
);

// === WRITE tools (5) ===

server.tool("vm_power",
  "Start, stop, shutdown, or reset a VM. Requires confirmation.",
  VmPowerInput.shape,
  wrapHandler(async (input) => {
    const { vmid, action } = input as { vmid: number; action: string };
    return vmPower(client, vmid, action);
  })
);

server.tool("container_power",
  "Start, stop, or shutdown a container. Requires confirmation.",
  ContainerPowerInput.shape,
  wrapHandler(async (input) => {
    const { vmid, action } = input as { vmid: number; action: string };
    return containerPower(client, vmid, action);
  })
);

server.tool("create_snapshot",
  "Create a snapshot of a VM or container. Requires confirmation.",
  CreateSnapshotInput.shape,
  wrapHandler(async (input) => {
    const { vmid, name, description, vmstate } = input as { vmid: number; name: string; description?: string; vmstate?: boolean };
    return createSnapshot(client, vmid, name, description, vmstate);
  })
);

server.tool("delete_snapshot",
  "Delete a snapshot. Irreversible. Requires confirmation.",
  DeleteSnapshotInput.shape,
  wrapHandler(async (input) => {
    const { vmid, snapshot_name } = input as { vmid: number; snapshot_name: string };
    return deleteSnapshot(client, vmid, snapshot_name);
  })
);

server.tool("confirm_action",
  "Execute a previously requested write operation using its confirmation token.",
  ConfirmActionInput.shape,
  wrapHandler(async (input) => {
    const { token } = input as { token: string };
    return executeConfirmation(token);
  })
);

// Start
async function main() {
  log.info(`Starting bench-proxmox, connecting to ${url}`);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("MCP server running on stdio");
}

main().catch((err) => {
  log.error("Fatal error:", err);
  process.exit(1);
});
