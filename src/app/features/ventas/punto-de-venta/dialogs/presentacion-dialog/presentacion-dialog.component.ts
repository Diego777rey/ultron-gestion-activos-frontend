import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  PresentacionProductoOutput,
  ProductoOutput,
} from '../../../../inventario/productos/interfaces/producto.interface';

export interface PresentacionElegida {
  presentacion: PresentacionProductoOutput;
  cantidad: number;
}

const TECLAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const CANTIDAD_MAX_DIGITOS = 6;

@Component({
  selector: 'app-presentacion-dialog',
  imports: [DecimalPipe],
  templateUrl: './presentacion-dialog.component.html',
  styleUrl: './presentacion-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onCerrar()',
  },
})
export class PresentacionDialogComponent implements OnInit, OnDestroy {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly cantidadInput = viewChild<ElementRef<HTMLInputElement>>('cantidadInput');

  readonly producto = input.required<ProductoOutput>();

  readonly cerrar = output<void>();
  readonly agregar = output<PresentacionElegida>();

  protected readonly teclas = TECLAS;
  protected readonly cantidad = signal('1');
  protected readonly cantidadInvalida = signal(false);
  protected readonly presentaciones = computed(() => this.producto().presentaciones ?? []);

  constructor() {
    afterNextRender(() => {
      const input = this.cantidadInput()?.nativeElement;
      if (!input) {
        return;
      }
      input.focus();
      input.select();
    });
  }

  ngOnInit(): void {
    this.document.body.appendChild(this.hostEl.nativeElement);
  }

  ngOnDestroy(): void {
    this.hostEl.nativeElement.remove();
  }

  protected onCerrar(): void {
    this.cerrar.emit();
  }

  protected pulsar(valor: number): void {
    this.cantidad.set(String(valor));
    this.cantidadInvalida.set(false);
  }

  protected borrar(): void {
    this.cantidad.set('');
    this.cantidadInvalida.set(false);
    this.cantidadInput()?.nativeElement.focus();
  }

  protected onCantidadInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, CANTIDAD_MAX_DIGITOS);
    this.cantidad.set(digits);
    this.cantidadInvalida.set(false);
    if (input.value !== digits) {
      input.value = digits;
    }
  }

  protected elegir(presentacion: PresentacionProductoOutput): void {
    const cantidad = this.cantidadNumerica();
    if (cantidad == null) {
      this.cantidadInvalida.set(true);
      this.cantidadInput()?.nativeElement.focus();
      return;
    }
    this.agregar.emit({ presentacion, cantidad });
  }

  protected etiqueta(presentacion: PresentacionProductoOutput): string {
    return `${presentacion.descripcion}, ${presentacion.cantidad} unidades`;
  }

  private cantidadNumerica(): number | null {
    const cantidad = Math.floor(Number(this.cantidad()));
    return Number.isFinite(cantidad) && cantidad > 0 ? cantidad : null;
  }
}
