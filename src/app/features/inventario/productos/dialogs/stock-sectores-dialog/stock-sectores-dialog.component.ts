import { Component, ChangeDetectionStrategy, inject, OnInit, signal, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoOutput } from '../../interfaces/producto.interface';
import { ProductoService } from '../../services/producto.service';

@Component({
  selector: 'app-stock-sectores-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4">
      @if (loading()) {
        <div class="text-center py-4">Cargando stock...</div>
      } @else if (error()) {
        <div class="text-center text-red-500 py-4">{{ error() }}</div>
      } @else {
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b">
              <th class="py-2">Sector</th>
              <th class="py-2 text-right">Cantidad (Considerando transferencias y ventas)</th>
            </tr>
          </thead>
          <tbody>
            @for (item of stock(); track item.id_stock) {
              <tr class="border-b">
                <td class="py-2">{{ item.sector?.nombre }}</td>
                <td class="py-2 text-right font-medium" [class.text-red-500]="item.cantidad < 0">{{ item.cantidad | number:'1.0-2' }}</td>
              </tr>
            }
            @if (stock().length === 0) {
              <tr>
                <td colspan="2" class="py-4 text-center text-gray-500">No hay información de stock por sectores.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .p-4 { padding: 1rem; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .w-full { width: 100%; }
    .border-collapse { border-collapse: collapse; }
    .border-b { border-bottom: 1px solid var(--border-color, #e0e0e0); }
    .font-medium { font-weight: 500; }
    .text-red-500 { color: #f44336; }
    .text-gray-500 { color: #9e9e9e; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockSectoresDialogComponent {
  private readonly productoService = inject(ProductoService);

  readonly producto = input.required<ProductoOutput>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stock = signal<any[]>([]);

  constructor() {
    effect(() => {
      const p = this.producto();
      if (p?.id_producto) {
        this.cargarStock(p.id_producto);
      } else {
        this.error.set('No se especificó un producto.');
        this.loading.set(false);
      }
    });
  }

  private cargarStock(idProducto: number): void {
    this.productoService.obtenerStockPorProducto(idProducto).subscribe({
      next: (stockData) => {
        this.stock.set(stockData);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el stock por sector.');
        this.loading.set(false);
      }
    });
  }
}
