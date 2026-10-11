import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CompraService } from '../../../../shared/services/compra.service';
import { ProveedorService } from '../../../../shared/services/proveedor.service';
import { VendedorService } from '../../../../shared/services/vendedor.service';
import { ProveedorOutput, VendedorOutput, CompraInput, ItemCompraInput } from '../../../../shared/models/compras.model';

interface StepDef {
  index: number;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-compras-stepper',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './compras-stepper.component.html',
  styleUrl: './compras-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprasStepperComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly compraService = inject(CompraService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly vendedorService = inject(VendedorService);

  protected readonly steps: StepDef[] = [
    { index: 1, label: 'Proveedor', icon: 'store' },
    { index: 2, label: 'Datos Factura', icon: 'receipt' },
    { index: 3, label: 'Resumen', icon: 'check_circle' },
  ];

  protected readonly currentStep = signal(1);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly proveedores = signal<ProveedorOutput[]>([]);
  protected readonly vendedores = signal<VendedorOutput[]>([]);
  protected readonly loadingProveedores = signal(false);
  protected readonly loadingVendedores = signal(false);

  protected readonly selectedProveedor = signal<ProveedorOutput | null>(null);

  protected readonly proveedorForm = this.fb.nonNullable.group({
    idProveedor: [0, [Validators.required, Validators.min(1)]],
    idVendedor: [0],
  });

  protected readonly datosForm = this.fb.nonNullable.group({
    numeroFactura: [''],
    timbrado: [''],
    fechaFactura: [''],
    formaPago: ['EFECTIVO', Validators.required],
    moneda: ['PYG', Validators.required],
    cotizacion: [1, [Validators.required, Validators.min(0)]],
    observaciones: [''],
  });

  ngOnInit(): void {
    this.loadProveedores();
  }

  protected loadProveedores(): void {
    this.loadingProveedores.set(true);
    this.proveedorService.listarProveedoresActivos().subscribe({
      next: (data) => {
        this.proveedores.set(data);
        this.loadingProveedores.set(false);
      },
      error: (err: Error) => {
        this.loadingProveedores.set(false);
        this.error.set('Error al cargar proveedores');
      },
    });
  }

  protected onProveedorChange(): void {
    const idProveedor = this.proveedorForm.get('idProveedor')?.value;
    if (idProveedor && idProveedor > 0) {
      const proveedor = this.proveedores().find(p => p.id_proveedor === idProveedor);
      this.selectedProveedor.set(proveedor || null);
      this.loadVendedores(idProveedor);
    } else {
      this.selectedProveedor.set(null);
      this.vendedores.set([]);
    }
  }

  protected loadVendedores(idProveedor: number): void {
    this.loadingVendedores.set(true);
    this.vendedorService.listarVendedoresPorProveedor(idProveedor).subscribe({
      next: (data) => {
        this.vendedores.set(data);
        this.loadingVendedores.set(false);
      },
      error: (err: Error) => {
        this.loadingVendedores.set(false);
        this.error.set('Error al cargar vendedores');
      },
    });
  }

  protected puedeAvanzar(): boolean {
    if (this.currentStep() === 1) {
      return this.proveedorForm.valid && this.proveedorForm.get('idProveedor')?.value > 0;
    }
    if (this.currentStep() === 2) {
      return this.datosForm.valid;
    }
    return true;
  }

  protected siguiente(): void {
    this.error.set(null);
    const step = this.currentStep();
    
    if (step === 1 && !this.puedeAvanzar()) {
      this.error.set('Selecciona un proveedor para continuar');
      return;
    }
    
    if (step === 2 && !this.puedeAvanzar()) {
      this.error.set('Completa los datos de la factura');
      return;
    }
    
    if (step < 3) {
      this.currentStep.set(step + 1);
    } else {
      this.guardarCompra();
    }
  }

  protected atras(): void {
    this.error.set(null);
    const step = this.currentStep();
    if (step <= 1) {
      this.cancelar();
      return;
    }
    this.currentStep.set(step - 1);
  }

  protected irAPaso(index: number): void {
    if (index === this.currentStep()) {
      return;
    }
    this.error.set(null);
    this.currentStep.set(index);
  }

  protected cancelar(): void {
    this.router.navigate(['/compras']);
  }

  private guardarCompra(): void {
    const proveedorData = this.proveedorForm.getRawValue();
    const datosData = this.datosForm.getRawValue();

    const input: CompraInput = {
      idProveedor: proveedorData.idProveedor,
      idVendedor: proveedorData.idVendedor > 0 ? proveedorData.idVendedor : undefined,
      numeroFactura: datosData.numeroFactura || undefined,
      timbrado: datosData.timbrado || undefined,
      fechaFactura: datosData.fechaFactura || undefined,
      formaPago: datosData.formaPago,
      moneda: datosData.moneda,
      cotizacion: datosData.cotizacion,
      observaciones: datosData.observaciones || undefined,
      items: [], // En una implementación completa, aquí irían los items del carrito
    };

    this.saving.set(true);
    this.error.set(null);

    this.compraService.registrarCompra(input).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/compras']);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar la compra');
      },
    });
  }
}
