import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ModalComponent } from '../modal/modal';
import { DataTableComponent } from '../data-table/data-table';
import { PaginatorComponent } from '../paginator/paginator';
import { UiButtonComponent } from '../ui-button/ui-button';
import { TableColumn } from '../../models/table-column.model';
import { PageChange } from '../../models/pagination.model';

@Component({
  selector: 'app-entity-searcher',
  templateUrl: './entity-searcher.html',
  styleUrl: './entity-searcher.scss',
  imports: [ModalComponent, DataTableComponent, PaginatorComponent, UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntitySearcherComponent<T> {
  readonly items = input<T[]>([]);
  readonly value = input<any>(null);
  readonly displayFn = input<(item: T) => string>((item) => String(item));
  readonly keyFn = input<(item: T) => any>((item) => (item as any).id);
  readonly label = input<string>('Buscar...');
  readonly searchPlaceholder = input<string>('Buscar...');
  readonly disabled = input<boolean>(false);
  readonly error = input<boolean>(false);
  readonly errorText = input<string>('');

  /**
   * Permite tipear en el input externo y abrir el buscador genérico con Enter / lupa,
   * aplicando el texto como filtro inicial del modal.
   */
  readonly quickEntry = input<boolean>(false);

  // Table and Pagination properties
  readonly columns = input<TableColumn<T>[]>([]);
  readonly useTable = input<boolean>(true);
  readonly backendPagination = input<boolean>(false);
  readonly totalItems = input<number>(0);
  readonly pageSize = input<number>(10);
  readonly pageIndex = input<number>(0);
  readonly loading = input<boolean>(false);
  readonly modalWidth = input<string>('900px');

  // Botón "Adicionar": permite crear la entidad (cliente, funcionario, etc.)
  // desde el propio buscador cuando no se encuentra por su documento.
  readonly allowAdd = input<boolean>(false);
  readonly addLabel = input<string>('Adicionar');

  readonly valueChange = output<any>();
  readonly itemChange = output<T | null>();
  readonly pageChange = output<PageChange>();
  readonly searchChange = output<string>();
  readonly addClicked = output<void>();

  private readonly modalSearchInput = viewChild<ElementRef<HTMLInputElement>>('modalSearchInput');

  protected readonly modalOpen = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly quickQuery = signal('');

  protected readonly filteredItems = computed(() => {
    if (this.backendPagination()) return this.items();
    const query = this.searchQuery().toLowerCase().trim();
    const all = this.items();
    if (!query) return all;
    const dfn = this.displayFn();
    return all.filter((i) => dfn(i).toLowerCase().includes(query));
  });

  protected readonly displayTotal = computed(() => {
    return this.backendPagination() ? this.totalItems() : this.filteredItems().length;
  });

  protected readonly displayValue = computed(() => {
    // En quickEntry, mientras se escribe se muestra el texto; si no, el ítem seleccionado.
    if (this.quickEntry() && this.quickQuery()) {
      return this.quickQuery();
    }
    const val = this.value();
    if (val === null || val === undefined || val === '') {
      return this.quickEntry() ? this.quickQuery() : '';
    }
    const all = this.items();
    const kfn = this.keyFn();
    const match = all.find((i) => kfn(i) === val);
    return match ? this.displayFn()(match) : this.quickEntry() ? this.quickQuery() : '';
  });

  protected onOuterClick(): void {
    if (!this.quickEntry()) {
      this.openModal();
    }
  }

  protected onOuterInput(raw: string): void {
    if (this.quickEntry()) {
      this.quickQuery.set(raw);
    }
  }

  protected onOuterKeydown(event: KeyboardEvent): void {
    if (!this.quickEntry() || event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.openModalWithQuery(this.quickQuery());
  }

  protected onSearch(query: string) {
    const upperQuery = query.toUpperCase();
    this.searchQuery.set(upperQuery);
    this.searchChange.emit(upperQuery);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.searchChange.emit('');
  }

  protected onAdd(): void {
    this.addClicked.emit();
  }

  protected onPageChange(event: PageChange): void {
    this.pageChange.emit(event);
  }

  protected openModal(): void {
    if (this.disabled()) return;
    if (this.quickEntry()) {
      this.openModalWithQuery(this.quickQuery());
      return;
    }
    this.searchQuery.set('');
    this.modalOpen.set(true);
  }

  protected openModalWithQuery(rawQuery: string): void {
    if (this.disabled()) return;
    const query = (rawQuery ?? '').toUpperCase().trim();
    this.searchQuery.set(query);
    this.searchChange.emit(query);
    this.modalOpen.set(true);
    queueMicrotask(() => {
      const el = this.modalSearchInput()?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected selectItem(item: T): void {
    const val = this.keyFn()(item);
    this.valueChange.emit(val);
    this.itemChange.emit(item);
    if (this.quickEntry()) {
      this.quickQuery.set('');
    }
    this.closeModal();
  }
}
