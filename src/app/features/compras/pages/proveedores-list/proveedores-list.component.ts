import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProveedorService } from '../../../../shared/services/proveedor.service';
import { ProveedorOutput } from '../../../../shared/models/compras.model';

@Component({
  selector: 'app-proveedores-list',
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="page-header__content">
          <div class="page-header__title">
            <span class="material-icons">store</span>
            <h1>Proveedores</h1>
          </div>
        </div>
      </header>

      <div class="page-content">
        @if (cargando()) {
          <div class="loading">
            <span class="material-icons spin">refresh</span>
            <p>Cargando proveedores...</p>
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
                  <th>Tipo</th>
                  <th>Nombre/Razón Social</th>
                  <th>RUC</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (proveedor of proveedores(); track proveedor.id_proveedor) {
                  <tr>
                    <td>
                      <span class="badge" [class.badge-info]="proveedor.tipo_persona === 'FISICA'" 
                            [class.badge-success]="proveedor.tipo_persona === 'JURIDICA'">
                        {{ proveedor.tipo_persona === 'FISICA' ? 'Física' : 'Jurídica' }}
                      </span>
                    </td>
                    <td>{{ proveedor.nombre_completo || getNombreCompleto(proveedor) }}</td>
                    <td>{{ proveedor.ruc }}</td>
                    <td>{{ proveedor.telefono || '-' }}</td>
                    <td>{{ proveedor.email || '-' }}</td>
                    <td>{{ proveedor.ciudad || '-' }}</td>
                    <td>
                      <span class="badge" [class.badge-success]="proveedor.activo" 
                            [class.badge-danger]="!proveedor.activo">
                        {{ proveedor.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="no-data">No hay proveedores registrados</td>
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
      
      &.badge-info {
        background: var(--primary-color);
        color: var(--on-primary-color);
      }
      
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
export class ProveedoresListComponent implements OnInit {
  private readonly proveedorService = inject(ProveedorService);
  private readonly router = inject(Router);

  protected readonly proveedores = signal<ProveedorOutput[]>([]);
  protected readonly cargando = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarProveedores();
  }

  private cargarProveedores(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.proveedorService.findAll(true).subscribe({
      next: (data: ProveedorOutput[]) => {
        this.proveedores.set(data);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.error.set('Error al cargar proveedores');
        this.cargando.set(false);
        console.error(err);
      }
    });
  }

  protected getNombreCompleto(proveedor: ProveedorOutput): string {
    if (proveedor.tipo_persona === 'FISICA') {
      return `${proveedor.nombre || ''} ${proveedor.apellido || ''}`.trim();
    } else {
      return proveedor.razon_social || '';
    }
  }
}
