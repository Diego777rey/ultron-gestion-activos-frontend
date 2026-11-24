import * as os from 'node:os';

export interface NetworkInterfaceInfo {
  name: string;
  mac: string;
  family: 'IPv4' | 'IPv6';
  address: string;
  internal: boolean;
}

export interface DeviceIdentity {
  /** MAC principal normalizada (AA:BB:CC:DD:EE:FF), o null si no hay. */
  macAddress: string | null;
  hostname: string;
  platform: NodeJS.Platform;
  interfaces: NetworkInterfaceInfo[];
}

const VIRTUAL_IFACE =
  /vmware|virtualbox|vbox|hyper-?v|docker|veth|br-|virbr|loopback|^lo$|^lo\d+|vethernet|tap\d+|tun\d+|wsl|npcap|isatap|teredo|bluetooth/i;

function normalizeMac(raw: string): string | null {
  const hex = raw.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (hex.length !== 12 || hex === '000000000000') {
    return null;
  }
  return hex.match(/.{2}/g)!.join(':');
}

function interfacePriority(name: string): number {
  const lower = name.toLowerCase();
  if (/^(eth|enp|eno|ens|ethernet|local area connection)/i.test(lower)) {
    return 10;
  }
  if (/^(wlan|wlp|wl|wi-?fi|wifi)/i.test(lower)) {
    return 20;
  }
  return 50;
}

/** Lista interfaces físicas con MAC usable (Windows y Linux). */
export function listNetworkInterfaces(): NetworkInterfaceInfo[] {
  const result: NetworkInterfaceInfo[] = [];
  const seenMac = new Set<string>();

  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (!addrs || VIRTUAL_IFACE.test(name)) {
      continue;
    }
    for (const addr of addrs) {
      if (addr.internal) {
        continue;
      }
      const mac = normalizeMac(addr.mac);
      if (!mac || seenMac.has(mac)) {
        continue;
      }
      seenMac.add(mac);
      result.push({
        name,
        mac,
        family: addr.family === 'IPv6' ? 'IPv6' : 'IPv4',
        address: addr.address,
        internal: false,
      });
    }
  }

  return result.sort((a, b) => interfacePriority(a.name) - interfacePriority(b.name));
}

export function getDeviceIdentity(): DeviceIdentity {
  const interfaces = listNetworkInterfaces();
  return {
    macAddress: interfaces[0]?.mac ?? null,
    hostname: os.hostname(),
    platform: process.platform,
    interfaces,
  };
}
