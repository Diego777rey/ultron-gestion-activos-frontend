import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FilteredPaginationState } from '../../../../../shared/utils/filtered-pagination.util';

export interface CategoriaTablaItem {
  nombre: string;
  estado?: boolean;
}

/** Tabla para elegir una categoría o subcategoría dentro de un asistente. */
@Component({
  selector: 'app-categoria-tabla',
  templateUrl: './categoria-tabla.component.html',
  styleUrl: './categoria-tabla.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriaTablaComponent<T extends CategoriaTablaItem> {
  readonly lista = input.required<FilteredPaginationState<T>>();
  readonly idDe = input.required<(item: T) => number | undefined>();
  readonly seleccionadoId = input<number | undefined>(undefined);
  readonly cargando = input(false);
  /** Si se indica, se muestra como categoría padre de la lista. */
  readonly categoriaPadre = input<string | undefined>(undefined);
  /** Ej: "Buscar categoría". */
  readonly buscarEtiqueta = input.required<string>();
  readonly cargandoTexto = input.required<string>();
  readonly vacioTexto = input.required<string>();
  readonly eliminarTitulo = input.required<string>();

  readonly seleccionar = output<T>();
  readonly eliminar = output<T>();
  readonly actualizar = output<void>();
  readonly agregar = output<void>();

  protected onEliminar(item: T, event: Event): void {
    event.stopPropagation();
    this.eliminar.emit(item);
  }
}
