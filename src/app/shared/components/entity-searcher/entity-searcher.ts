import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ModalComponent } from '../modal/modal';
import { DataTableComponent } from '../data-table/data-table';
import { PaginatorComponent } from '../paginator/paginator';
import { TableColumn } from '../../models/table-column.model';
import { PageChange } from '../../models/pagination.model';

@Component({
  selector: 'app-entity-searcher',
  templateUrl: './entity-searcher.html',
  styleUrl: './entity-searcher.scss',
  imports: [ModalComponent, DataTableComponent, PaginatorComponent],
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

  // Table and Pagination properties
  readonly columns = input<TableColumn<T>[]>([]);
  readonly useTable = input<boolean>(true);
  readonly backendPagination = input<boolean>(false);
  readonly totalItems = input<number>(0);
  readonly pageSize = input<number>(10);
  readonly pageIndex = input<number>(0);
  readonly loading = input<boolean>(false);
  readonly modalWidth = input<string>('900px');

  readonly valueChange = output<any>();
  readonly itemChange = output<T | null>();
  readonly pageChange = output<PageChange>();
  readonly searchChange = output<string>();

  protected readonly modalOpen = signal(false);
  protected readonly searchQuery = signal('');

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

  protected onSearch(query: string) {
    const upperQuery = query.toUpperCase();
    this.searchQuery.set(upperQuery);
    this.searchChange.emit(upperQuery);
  }

  protected onPageChange(event: PageChange): void {
    this.pageChange.emit(event);
  }

  protected readonly displayValue = computed(() => {
    const val = this.value();
    if (val === null || val === undefined || val === '') return '';
    const all = this.items();
    const kfn = this.keyFn();
    const match = all.find((i) => kfn(i) === val);
    return match ? this.displayFn()(match) : '';
  });

  protected openModal(): void {
    if (this.disabled()) return;
    this.searchQuery.set('');
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected selectItem(item: T): void {
    const val = this.keyFn()(item);
    this.valueChange.emit(val);
    this.itemChange.emit(item);
    this.closeModal();
  }
}
