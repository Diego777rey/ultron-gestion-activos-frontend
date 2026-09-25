import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { PresentacionProductoInput, PresentacionProductoOutput } from '../../interfaces/producto.interface';

interface FilaPresentacion {
  id_presentacion_producto: number | null;
  descripcion: string;
  codigoBarras: string;
  cantidad: number | null;
  precio: number | null;
}

@Component({
  selector: 'app-presentaciones-editor',
  templateUrl: './presentaciones-editor.component.html',
  styleUrl: './presentaciones-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentacionesEditorComponent {
  readonly items = input<PresentacionProductoOutput[]>([]);

  protected readonly filas = signal<FilaPresentacion[]>([]);
  protected readonly submitted = signal(false);

  constructor() {
    effect(() => {
      const items = this.items();
      this.filas.set(items.map((item) => this.desdeOutput(item)));
      this.submitted.set(false);
    });
  }

  invalid(): boolean {
    const filas = this.filas();
    return filas.some((fila, index) => this.filaInvalida(fila, index));
  }

  marcarErrores(): void {
    this.submitted.set(true);
  }

  toInput(): PresentacionProductoInput[] {
    return this.filas().map((fila) => {
      const item: PresentacionProductoInput = {
        descripcion: fila.descripcion.trim(),
        codigoBarras: fila.codigoBarras.trim(),
        cantidad: Number(fila.cantidad),
        precio: Number(fila.precio),
      };
      if (fila.id_presentacion_producto != null) {
        item.id_presentacion_producto = fila.id_presentacion_producto;
      }
      return item;
    });
  }

  protected agregar(): void {
    this.filas.update((filas) => [
      ...filas,
      { id_presentacion_producto: null, descripcion: '', codigoBarras: '', cantidad: 1, precio: 0 },
    ]);
  }

  protected quitar(index: number): void {
    this.filas.update((filas) => filas.filter((_, i) => i !== index));
  }

  protected onDescripcion(index: number, value: string): void {
    this.patch(index, { descripcion: value.toUpperCase() });
  }

  protected onCodigoBarras(index: number, value: string): void {
    this.patch(index, { codigoBarras: value });
  }

  protected onCantidad(index: number, value: string): void {
    this.patch(index, { cantidad: value === '' ? null : Number(value) });
  }

  protected onPrecio(index: number, value: string): void {
    this.patch(index, { precio: value === '' ? null : Number(value) });
  }

  protected mostrarError(index: number): boolean {
    return this.submitted() && this.filaInvalida(this.filas()[index], index);
  }

  protected mensajeError(index: number): string {
    const fila = this.filas()[index];
    if (!fila.descripcion.trim()) {
      return 'La descripción es obligatoria';
    }
    if (this.descripcionRepetida(fila, index)) {
      return 'Esa descripción ya está cargada';
    }
    if (!fila.codigoBarras.trim()) {
      return 'El código de barras es obligatorio';
    }
    if (this.codigoRepetido(fila, index)) {
      return 'Ese código de barras ya está cargado';
    }
    if (fila.cantidad == null || !Number.isFinite(fila.cantidad) || fila.cantidad <= 0) {
      return 'La cantidad debe ser mayor a cero';
    }
    if (fila.precio == null || !Number.isFinite(fila.precio) || fila.precio < 0) {
      return 'El precio no puede ser negativo';
    }
    return '';
  }

  private patch(index: number, cambio: Partial<FilaPresentacion>): void {
    this.filas.update((filas) => filas.map((fila, i) => (i === index ? { ...fila, ...cambio } : fila)));
  }

  private desdeOutput(item: PresentacionProductoOutput): FilaPresentacion {
    const id = item.id_presentacion_producto;
    return {
      id_presentacion_producto: id == null ? null : Number(id),
      descripcion: item.descripcion ?? '',
      codigoBarras: item.codigoBarras ?? '',
      cantidad: this.aNumero(item.cantidad),
      precio: this.aNumero(item.precio),
    };
  }

  private aNumero(value: number | string | null | undefined): number | null {
    if (value == null || value === '') {
      return null;
    }
    const numero = Number(value);
    return Number.isFinite(numero) ? numero : null;
  }

  private filaInvalida(fila: FilaPresentacion | undefined, index: number): boolean {
    if (!fila) {
      return true;
    }
    if (!fila.descripcion.trim() || this.descripcionRepetida(fila, index)) {
      return true;
    }
    if (!fila.codigoBarras.trim() || this.codigoRepetido(fila, index)) {
      return true;
    }
    if (fila.cantidad == null || !Number.isFinite(fila.cantidad) || fila.cantidad <= 0) {
      return true;
    }
    return fila.precio == null || !Number.isFinite(fila.precio) || fila.precio < 0;
  }

  private descripcionRepetida(fila: FilaPresentacion, index: number): boolean {
    const descripcion = fila.descripcion.trim().toUpperCase();
    if (!descripcion) {
      return false;
    }
    return this.filas().some(
      (otra, i) => i !== index && otra.descripcion.trim().toUpperCase() === descripcion
    );
  }

  private codigoRepetido(fila: FilaPresentacion, index: number): boolean {
    const codigo = fila.codigoBarras.trim().toLowerCase();
    if (!codigo) {
      return false;
    }
    return this.filas().some(
      (otra, i) => i !== index && otra.codigoBarras.trim().toLowerCase() === codigo
    );
  }
}
