import { Injectable, signal } from '@angular/core';
import { SectorOutput } from '../interfaces/sector.interface';

/** Recuerda el último sector creado en la sesión para precargarlo en una OT nueva. */
@Injectable({ providedIn: 'root' })
export class UltimoSectorStore {
  private readonly sector = signal<SectorOutput | null>(null);
  readonly lastCreated = this.sector.asReadonly();

  remember(sector: SectorOutput): void {
    this.sector.set(sector);
  }
}
