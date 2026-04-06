import { z } from "zod";

// Read tools
export const ListResourcesInput = z.object({
  type: z.enum(["vm", "node", "storage", "all"]).default("all").optional()
    .describe("Filter resources by type. Default: all."),
});

export const GetClusterStatusInput = z.object({});

export const ListNodesInput = z.object({});

export const ListVmsInput = z.object({
  node: z.string().optional()
    .describe("Filter VMs to a specific node."),
  status: z.enum(["running", "stopped"]).optional()
    .describe("Filter VMs by status."),
});

export const GetVmInput = z.object({
  vmid: z.number().int().min(1)
    .describe("VM ID (e.g. 100). Node is resolved automatically."),
});

export const ListContainersInput = z.object({
  node: z.string().optional()
    .describe("Filter containers to a specific node."),
  status: z.enum(["running", "stopped"]).optional()
    .describe("Filter containers by status."),
});

export const GetContainerInput = z.object({
  vmid: z.number().int().min(1)
    .describe("Container ID (e.g. 200). Node is resolved automatically."),
});

export const ListStorageInput = z.object({
  node: z.string().optional()
    .describe("Filter storage to a specific node."),
});

export const ListSnapshotsInput = z.object({
  vmid: z.number().int().min(1)
    .describe("VM or container ID. Node and type are resolved automatically."),
});

export const ListTasksInput = z.object({
  node: z.string().optional()
    .describe("Filter tasks to a specific node."),
  vmid: z.number().int().min(1).optional()
    .describe("Filter tasks for a specific VM/container."),
  limit: z.number().int().min(1).max(100).default(20).optional()
    .describe("Number of tasks to return. Default: 20."),
});

export const GetTaskStatusInput = z.object({
  upid: z.string()
    .describe("Task UPID string."),
});

// Write tools
export const VmPowerInput = z.object({
  vmid: z.number().int().min(1)
    .describe("VM ID."),
  action: z.enum(["start", "stop", "shutdown", "reset"])
    .describe("Power action: start, stop (hard), shutdown (graceful ACPI), reset (hard)."),
});

export const ContainerPowerInput = z.object({
  vmid: z.number().int().min(1)
    .describe("Container ID."),
  action: z.enum(["start", "stop", "shutdown"])
    .describe("Power action: start, stop (hard), shutdown (graceful)."),
});

export const CreateSnapshotInput = z.object({
  vmid: z.number().int().min(1)
    .describe("VM or container ID."),
  name: z.string().min(1).max(40)
    .describe("Snapshot name (alphanumeric, dashes, underscores)."),
  description: z.string().optional()
    .describe("Optional snapshot description."),
  vmstate: z.boolean().default(false).optional()
    .describe("Include RAM state in snapshot (QEMU VMs only). Default: false."),
});

export const DeleteSnapshotInput = z.object({
  vmid: z.number().int().min(1)
    .describe("VM or container ID."),
  snapshot_name: z.string()
    .describe("Name of the snapshot to delete."),
});

export const ConfirmActionInput = z.object({
  token: z.string()
    .describe("Confirmation token from a previous write operation."),
});
