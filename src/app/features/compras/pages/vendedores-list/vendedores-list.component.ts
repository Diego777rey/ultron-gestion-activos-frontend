import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VendedorService } from '../../../../shared/services/vendedor.service';
import { VendedorOutput } from '../../../../shared/models/compras.model';

@Component({
  selector: 'app-vendedores-list',
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="page-header__content">
          <div class="page-header__title">
            <span class="material-icons">badge</span>
            <h1>Vendedores</h1>
          </div>
        </div>
      </header>

      <div class="page-content">
        @if (cargando()) {
          <div class="loading">
            <span class="material-icons spin">refresh</span>
            <p>Cargando vendedores...</p>
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
                  <th>Nombre Completo</th>
                  <th>Proveedor</th>
                  <th>Cargo</th>
                  <th>Teléfono</th>
                  <th>Celular</th>
                  <th>Email</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (vendedor of vendedores(); track vendedor.id_vendedor) {
                  <tr>
                    <td>{{ vendedor.nombre_completo || (vendedor.nombre + ' ' + vendedor.apellido) }}</td>
                    <td>{{ vendedor.proveedor_nombre || '-' }}</td>
                    <td>{{ vendedor.cargo || '-' }}</td>
                    <td>{{ vendedor.telefono || '-' }}</td>
                    <td>{{ vendedor.celular || '-' }}</td>
                    <td>{{ vendedor.email || '-' }}</td>
                    <td>
                      <span class="badge" [class.badge-success]="vendedor.activo" 
                            [class.badge-danger]="!vendedor.activo">
                        {{ vendedor.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="no-data">No hay vendedores registrados</td>
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
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      
      &.badge-success {
        background: var(--success-bg);
        color: var(--success-color);
        border: 1px solid var(--success-color);
      }
      
      &.badge-danger {
        background: var(--danger-bg);
        color: var(--danger-color);
        border: 1px solid var(--danger-border);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendedoresListComponent implements OnInit {
  private readonly vendedorService = inject(VendedorService);

  protected readonly vendedores = signal<VendedorOutput[]>([]);
  protected readonly cargando = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarVendedores();
  }

  private cargarVendedores(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.vendedorService.listarVendedores().subscribe({
      next: (data) => {
        this.vendedores.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar vendedores');
        this.cargando.set(false);
        console.error(err);
      }
    });
  }
}
