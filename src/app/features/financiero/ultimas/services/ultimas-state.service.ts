import { Injectable, signal } from '@angular/core';
import { DateRangeValue, dateRangeLastDays } from '../../../../shared/models/date-range.model';
import { CajaOutput } from '../../cajas/interfaces/caja.interface';

@Injectable({ providedIn: 'root' })
export class UltimasStateService {
  readonly cajaSeleccionada = signal<CajaOutput | null>(null);
  readonly search = signal('');
  readonly estado = signal('');
  readonly dateRange = signal<DateRangeValue>(dateRangeLastDays(7));
  readonly pageIndex = signal(0);
  readonly pageSize = signal(15);
}
