import { ProxmoxClient } from "../lib/client.js";
import type { z } from "zod";
import type { ListStorageInput } from "../lib/schemas.js";

export async function listStorage(
  client: ProxmoxClient,
  input: z.infer<typeof ListStorageInput>
) {
  const resources = await client.getResources("storage");
  let storages = resources;

  if (input.node) {
    storages = storages.filter((s) => s.node === input.node);
  }

  return {
    count: storages.length,
    storage: storages.map((s) => ({
      storage: s.name ?? (s as Record<string, unknown>).storage ?? s.id,
      node: s.node,
      type: (s as Record<string, unknown>).plugintype ?? (s as Record<string, unknown>).storage_type ?? "",
      status: s.status,
      content: (s as Record<string, unknown>).content ?? "",
      total_gb: s.maxdisk != null ? Math.round(s.maxdisk / 1024 / 1024 / 1024 * 100) / 100 : 0,
      used_gb: s.disk != null ? Math.round(s.disk / 1024 / 1024 / 1024 * 100) / 100 : 0,
      avail_gb: s.maxdisk != null && s.disk != null
        ? Math.round((s.maxdisk - s.disk) / 1024 / 1024 / 1024 * 100) / 100
        : 0,
      percent_used: s.maxdisk && s.maxdisk > 0 && s.disk != null
        ? Math.round(s.disk / s.maxdisk * 10000) / 100
        : 0,
    })),
  };
}
