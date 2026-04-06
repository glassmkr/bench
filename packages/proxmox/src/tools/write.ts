import { ProxmoxClient } from "../lib/client.js";
import { requestConfirmation, type ConfirmationRequest } from "@glassmkr/bench-shared";

const VM_ACTION_DESC: Record<string, { desc: string; reversible: boolean }> = {
  start: { desc: "Start VM. No data risk.", reversible: true },
  stop: { desc: "Hard stop. Running processes will be killed immediately.", reversible: true },
  shutdown: { desc: "Graceful shutdown via ACPI. VM will attempt clean shutdown.", reversible: true },
  reset: { desc: "Hard reset. Equivalent to pressing the reset button. Running processes will be killed.", reversible: false },
};

const CT_ACTION_DESC: Record<string, { desc: string; reversible: boolean }> = {
  start: { desc: "Start container. No data risk.", reversible: true },
  stop: { desc: "Hard stop container. Running processes will be killed immediately.", reversible: true },
  shutdown: { desc: "Graceful shutdown. Container will attempt clean shutdown.", reversible: true },
};

export async function vmPower(
  client: ProxmoxClient,
  vmid: number,
  action: string
): Promise<ConfirmationRequest> {
  const resolved = await client.resolveVmid(vmid);
  const info = VM_ACTION_DESC[action] ?? { desc: `VM power action: ${action}`, reversible: false };
  const typePath = resolved.type === "qemu" ? "qemu" : "lxc";

  return requestConfirmation(
    `vm_${action}`,
    `${resolved.type.toUpperCase()} ${vmid} (${resolved.name}) on node ${resolved.node}`,
    info.desc,
    info.reversible,
    async () => {
      const upid = await client.post<string>(
        `/nodes/${resolved.node}/${typePath}/${vmid}/status/${action}`
      );
      return { success: true, task_upid: upid, message: `VM ${vmid} ${action} initiated. Task: ${upid}` };
    }
  );
}

export async function containerPower(
  client: ProxmoxClient,
  vmid: number,
  action: string
): Promise<ConfirmationRequest> {
  const resolved = await client.resolveVmid(vmid);
  const info = CT_ACTION_DESC[action] ?? { desc: `Container action: ${action}`, reversible: false };

  return requestConfirmation(
    `container_${action}`,
    `LXC ${vmid} (${resolved.name}) on node ${resolved.node}`,
    info.desc,
    info.reversible,
    async () => {
      const upid = await client.post<string>(
        `/nodes/${resolved.node}/lxc/${vmid}/status/${action}`
      );
      return { success: true, task_upid: upid, message: `Container ${vmid} ${action} initiated. Task: ${upid}` };
    }
  );
}

export async function createSnapshot(
  client: ProxmoxClient,
  vmid: number,
  name: string,
  description?: string,
  vmstate?: boolean
): Promise<ConfirmationRequest> {
  const resolved = await client.resolveVmid(vmid);
  const typePath = resolved.type === "qemu" ? "qemu" : "lxc";
  const stateNote = vmstate ? " This will briefly pause the VM to capture RAM state." : "";

  return requestConfirmation(
    "create_snapshot",
    `${resolved.type.toUpperCase()} ${vmid} (${resolved.name}) on node ${resolved.node}`,
    `Create snapshot '${name}'.${stateNote}`,
    true,
    async () => {
      const body: Record<string, unknown> = { snapname: name };
      if (description) body.description = description;
      if (vmstate && resolved.type === "qemu") body.vmstate = 1;
      const upid = await client.post<string>(
        `/nodes/${resolved.node}/${typePath}/${vmid}/snapshot`,
        body
      );
      return { success: true, task_upid: upid, message: `Snapshot '${name}' creation initiated. Task: ${upid}` };
    }
  );
}

export async function deleteSnapshot(
  client: ProxmoxClient,
  vmid: number,
  snapshotName: string
): Promise<ConfirmationRequest> {
  const resolved = await client.resolveVmid(vmid);
  const typePath = resolved.type === "qemu" ? "qemu" : "lxc";

  return requestConfirmation(
    "delete_snapshot",
    `Snapshot '${snapshotName}' on ${resolved.type.toUpperCase()} ${vmid} (${resolved.name})`,
    `Permanently delete snapshot '${snapshotName}'. This cannot be undone.`,
    false,
    async () => {
      const upid = await client.del<string>(
        `/nodes/${resolved.node}/${typePath}/${vmid}/snapshot/${encodeURIComponent(snapshotName)}`
      );
      return { success: true, task_upid: upid, message: `Snapshot '${snapshotName}' deletion initiated. Task: ${upid}` };
    }
  );
}
