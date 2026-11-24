import { Injectable } from '@angular/core';
import {
  DesktopDeviceIdentity,
  DesktopNetworkInterface,
} from '../../../types/ultron-desktop';

@Injectable({ providedIn: 'root' })
export class DeviceIdentityService {
  /** True cuando corre dentro de Electron con bridge de identidad. */
  get disponible(): boolean {
    return typeof window !== 'undefined' && typeof window.ultronDesktop?.getDeviceIdentity === 'function';
  }

  async getIdentity(): Promise<DesktopDeviceIdentity | null> {
    const fn = window.ultronDesktop?.getDeviceIdentity;
    if (!fn) {
      return null;
    }
    return fn();
  }

  async getMacAddress(): Promise<string | null> {
    const identity = await this.getIdentity();
    return identity?.macAddress ?? null;
  }

  async getHostname(): Promise<string | null> {
    const identity = await this.getIdentity();
    return identity?.hostname ?? null;
  }

  async listInterfaces(): Promise<DesktopNetworkInterface[]> {
    const fn = window.ultronDesktop?.listNetworkInterfaces;
    if (!fn) {
      return [];
    }
    return fn();
  }
}
