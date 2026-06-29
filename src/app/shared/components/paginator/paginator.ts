import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PageChange } from '../../models/pagination.model';

/**
 * Paginador genérico reutilizable.
 * Muestra el selector de elementos por página, el rango actual y los controles
 * de navegación. Es controlado por el consumidor (inputs) y notifica los cambios.
 */
@Component({
  selector: 'app-paginator',
  templateUrl: './paginator.html',
  styleUrl: './paginator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'paginator-host' },
})
export class PaginatorComponent {
  /** Total de elementos disponibles. */
  readonly total = input.required<number>();
  /** Índice de página actual (0-based). */
  readonly pageIndex = input<number>(0);
  /** Elementos por página. */
  readonly pageSize = input<number>(10);
  /** Opciones de tamaño de página. */
  readonly pageSizeOptions = input<number[]>([15, 25, 50, 100]);

  /** Emite cuando cambia la página o el tamaño. */
  readonly pageChange = output<PageChange>();

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize()))
  );

  protected readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : this.pageIndex() * this.pageSize() + 1
  );

  protected readonly rangeEnd = computed(() =>
    Math.min(this.total(), (this.pageIndex() + 1) * this.pageSize())
  );

  protected readonly canPrev = computed(() => this.pageIndex() > 0);
  protected readonly canNext = computed(() => this.pageIndex() + 1 < this.totalPages());

  protected onSizeChange(value: string): void {
    this.pageChange.emit({ pageIndex: 0, pageSize: Number(value) });
  }

  protected first(): void {
    if (this.canPrev()) {
      this.pageChange.emit({ pageIndex: 0, pageSize: this.pageSize() });
    }
  }

  protected prev(): void {
    if (this.canPrev()) {
      this.pageChange.emit({ pageIndex: this.pageIndex() - 1, pageSize: this.pageSize() });
    }
  }

  protected next(): void {
    if (this.canNext()) {
      this.pageChange.emit({ pageIndex: this.pageIndex() + 1, pageSize: this.pageSize() });
    }
  }

  protected last(): void {
    if (this.canNext()) {
      this.pageChange.emit({ pageIndex: this.totalPages() - 1, pageSize: this.pageSize() });
    }
  }
}
