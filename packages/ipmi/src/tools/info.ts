import { IpmiClient, parseKeyValueOutput } from "../lib/client.js";

export async function getBmcInfo(client: IpmiClient) {
  const raw = await client.exec("bmc", ["info"]);
  const kv = parseKeyValueOutput(raw);

  return {
    host: client.host,
    manufacturer: kv["Manufacturer Name"] ?? "unknown",
    product: kv["Product Name"] ?? "unknown",
    firmware_version: kv["Firmware Revision"] ?? "unknown",
    ipmi_version: kv["IPMI Version"] ?? "unknown",
    device_id: kv["Device ID"] ?? "",
  };
}

export async function getChassisStatus(client: IpmiClient) {
  const raw = await client.exec("chassis", ["status"]);
  const kv = parseKeyValueOutput(raw);

  return {
    host: client.host,
    power_on: kv["System Power"] === "on",
    power_overload: kv["Power Overload"] === "true",
    last_power_event: kv["Last Power Event"] ?? "unknown",
    intrusion: kv["Chassis Intrusion"] ?? "unknown",
    power_fault: kv["Power Fault"] === "true",
    drive_fault: kv["Drive Fault"] === "true",
    cooling_fault: kv["Cooling/Fan Fault"] === "true",
  };
}

export async function getBootDevice(client: IpmiClient) {
  const raw = await client.exec("chassis", ["bootparam", "get", "5"]);
  const lines = raw.toLowerCase();

  let device = "unknown";
  let persistent = false;

  if (lines.includes("force pxe")) device = "pxe";
  else if (lines.includes("force boot from default hard-drive") || lines.includes("force disk")) device = "disk";
  else if (lines.includes("force boot into bios")) device = "bios";
  else if (lines.includes("force boot from cd/dvd")) device = "cdrom";
  else if (lines.includes("no override")) device = "none (no override)";

  if (lines.includes("options apply to all future boots")) persistent = true;

  return {
    host: client.host,
    device,
    persistent,
  };
}

export async function getLanInfo(client: IpmiClient, channel: number) {
  const raw = await client.exec("lan", ["print", String(channel)]);
  const kv = parseKeyValueOutput(raw);

  return {
    host: client.host,
    channel,
    ip: kv["IP Address"] ?? "unknown",
    subnet: kv["Subnet Mask"] ?? "unknown",
    gateway: kv["Default Gateway IP"] ?? "unknown",
    mac: kv["MAC Address"] ?? "unknown",
    source: kv["IP Address Source"] ?? "unknown",
    vlan_id: kv["802.1q VLAN ID"] ?? "disabled",
  };
}

export async function getSolInfo(client: IpmiClient) {
  const raw = await client.exec("sol", ["info"]);
  const kv = parseKeyValueOutput(raw);

  return {
    host: client.host,
    enabled: kv["Enabled"] === "true",
    payload_port: kv["Payload Port"] ?? "",
    baud_rate: kv["Volatile Bit Rate (kbps)"] ?? kv["Non-Volatile Bit Rate (kbps)"] ?? "unknown",
    channel: kv["Payload Channel"] ?? "",
  };
}
