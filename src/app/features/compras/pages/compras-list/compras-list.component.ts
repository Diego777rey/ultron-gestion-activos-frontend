import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CompraService } from '../../../../shared/services/compra.service';
import { CompraOutput } from '../../../../shared/models/compras.model';

@Component({
  selector: 'app-compras-list',
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="page-header__content">
          <div class="page-header__title">
            <span class="material-icons">receipt_long</span>
            <h1>Lista de Compras</h1>
          </div>
          <button class="btn btn-primary" (click)="nuevaCompra()">
            <span class="material-icons">add</span>
            Nueva Compra
          </button>
        </div>
      </header>

      <div class="page-content">
        @if (cargando()) {
          <div class="loading">
            <span class="material-icons spin">refresh</span>
            <p>Cargando compras...</p>
          </div>
        } @else if (error()) {
          <div class="error-message">
            <span class="material-icons">error</span>
            <p>{{ error() }}</p>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>N° Factura</th>
                  <th>Moneda</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (compra of compras(); track compra.id_compra) {
                  <tr>
                    <td>{{ compra.fecha_compra | date:'dd/MM/yyyy' }}</td>
                    <td>{{ compra.proveedor_nombre }}</td>
                    <td>{{ compra.numero_factura || '-' }}</td>
                    <td>{{ compra.moneda }}</td>
                    <td>{{ compra.total | number:'1.0-0' }}</td>
                    <td>
                      <span class="badge" [class]="getEstadoBadgeClass(compra.estado)">
                        {{ compra.estado }}
                      </span>
                    </td>
                    <td class="actions-column">
                      <button class="btn-icon" (click)="editarCompra(compra.id_compra)" title="Editar">
                        <span class="material-icons">edit</span>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="no-data">No hay compras registradas</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .page-header {
      background: var(--surface-color);
      border-bottom: 1px solid var(--border-color);
      padding: 1rem 1.5rem;
    }
    
    .page-header__content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .page-header__title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      
      .material-icons {
        font-size: 1.75rem;
        color: var(--primary-color);
      }
      
      h1 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: var(--radius-md);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      
      &.btn-primary {
        background: var(--primary-color);
        color: var(--on-primary-color);
        
        &:hover {
          background: var(--primary-color-dark);
        }
      }
    }
    
    .page-content {
      flex: 1;
      overflow: auto;
      padding: 1.5rem;
    }
    
    .loading, .error-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 3rem;
      color: var(--text-secondary);
    }
    
    .material-icons.spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .table-container {
      background: var(--surface-color);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      overflow: hidden;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      
      th, td {
        padding: 0.75rem 1rem;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
      }
      
      th {
        background: var(--surface-raised);
        font-weight: 600;
        color: var(--text-primary);
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      td {
        color: var(--text-secondary);
      }
      
      tbody tr:hover {
        background: var(--hover-color);
      }
      
      .no-data {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
      }
      
      .actions-column {
        width: 100px;
      }
    }
    
    .btn-icon {
      background: transparent;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      transition: all 0.2s;
      
      &:hover {
        background: var(--hover-color);
        color: var(--primary-color);
      }
      
      .material-icons {
        font-size: 1.25rem;
      }
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      
      &.badge-borrador {
        background: var(--surface-raised);
        color: var(--text-secondary);
        border: 1px solid var(--border-strong);
      }
      
      &.badge-confirmada {
        background: var(--primary-color);
        color: var(--on-primary-color);
      }
      
      &.badge-recibida {
        background: var(--success-bg);
        color: var(--success-color);
        border: 1px solid var(--success-color);
      }
      
      &.badge-cancelada {
        background: var(--danger-bg);
        color: var(--danger-color);
        border: 1px solid var(--danger-border);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprasListComponent implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly router = inject(Router);

  protected readonly compras = signal<CompraOutput[]>([]);
  protected readonly cargando = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarCompras();
  }

  private cargarCompras(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.compraService.findAll(true).subscribe({
      next: (data: CompraOutput[]) => {
        this.compras.set(data);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.error.set('Error al cargar compras');
        this.cargando.set(false);
        console.error(err);
      }
    });
  }

  protected nuevaCompra(): void {
    this.router.navigate(['/compras/nueva']);
  }

  protected editarCompra(id: number): void {
    this.router.navigate(['/compras/editar', id]);
  }

  protected getEstadoBadgeClass(estado: string): string {
    const estadoLower = estado.toLowerCase();
    return `badge-${estadoLower}`;
  }
}
