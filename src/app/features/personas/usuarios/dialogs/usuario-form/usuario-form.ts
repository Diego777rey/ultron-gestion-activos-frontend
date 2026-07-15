import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { FuncionarioOutput } from '../../../funcionarios/interfaces/funcionario.interface';
import { FuncionarioService } from '../../../funcionarios/services/funcionario.service';
import { FuncionarioFormComponent } from '../../../funcionarios/dialogs/funcionario-form/funcionario-form';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { RoleOutput } from '../../../roles/interfaces/role.interface';
import { RoleService } from '../../../roles/services/role.service';
import { UsuarioInput, UsuarioOutput } from '../../interfaces/usuario.interface';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective, EntitySearcherComponent],
  templateUrl: './usuario-form.html',
  styleUrl: './usuario-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly funcionarioService = inject(FuncionarioService);
  private readonly roleService = inject(RoleService);
  private readonly dialogService = inject(AppDialogService);

  readonly usuario = input<UsuarioOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;
  protected loadingCatalogs = true;

  protected readonly passwordVisible = signal(false);

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  protected readonly roles = signal<RoleOutput[]>([]);
  protected readonly funcionarios = signal<FuncionarioOutput[]>([]);
  protected readonly selectedFuncionario = signal<FuncionarioOutput | null>(null);
  protected readonly funcionariosOcupados = signal<Set<string>>(new Set());

  // Pagination state
  protected readonly funcionariosTotal = signal<number>(0);
  protected readonly funcionariosPage = signal<number>(0);
  protected readonly funcionariosPageSize = signal<number>(10);
  protected readonly funcionariosFilter = signal<string>('');
  protected readonly loadingFuncionarios = signal<boolean>(false);

  protected readonly funcionarioColumns: TableColumn<FuncionarioOutput>[] = [
    { key: 'id_funcionario', header: 'Id', width: '80px' },
    { key: 'documento', header: 'Documento', value: (f) => f.persona?.documento ?? '' },
    { key: 'nombre', header: 'Nombre Completo', value: (f) => this.funcionarioLabel(f) },
  ];

  protected readonly funcionariosDisponibles = computed(() => {
    const ocupados = this.funcionariosOcupados();
    const actual = this.usuario()?.id_funcionario ?? null;
    
    let list = this.funcionarios();
    const selected = this.selectedFuncionario();
    if (selected && !list.find(f => f.id_funcionario === selected.id_funcionario)) {
      list = [selected, ...list];
    }

    return list.filter(
      (f) => f.id_funcionario && (!ocupados.has(f.id_funcionario) || f.id_funcionario === actual)
    );
  });

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(80)]],
    password: [''],
    email: ['', [Validators.email]],
    id_funcionario: ['', Validators.required],
    roleIds: this.fb.nonNullable.control<string[]>([]),
    activo: [true],
  });

  constructor() {
    effect(() => {
      const u = this.usuario();
      if (u) {
        this.isEdit = !!u.id;
        this.form.reset({
          username: u.username ?? '',
          password: '',
          email: u.email ?? '',
          id_funcionario: u.id_funcionario ?? '',
          roleIds: (u.roles ?? []).map((r) => r.id!).filter(Boolean),
          activo: u.activo ?? true,
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          username: '',
          password: '',
          email: '',
          id_funcionario: '',
          roleIds: [],
          activo: true,
        });
      }
    });
  }

  ngOnInit(): void {
    const actualIdFuncionario = this.usuario()?.id_funcionario;
    const requests: any = {
      roles: this.roleService.findAll(),
      usuarios: this.usuarioService.findAll(),
    };
    
    if (actualIdFuncionario) {
      requests.selectedFunc = this.funcionarioService.findById(actualIdFuncionario);
    }

    forkJoin(requests).subscribe({
      next: (res: any) => {
        this.roles.set(res.roles);
        const actualId = this.usuario()?.id;
        const ocupados = new Set<string>(
          res.usuarios
            .filter((u: any) => u.id_funcionario && u.id !== actualId)
            .map((u: any) => u.id_funcionario as string)
        );
        this.funcionariosOcupados.set(ocupados);
        
        if (res.selectedFunc) {
          this.selectedFuncionario.set(res.selectedFunc);
        }

        this.loadingCatalogs = false;
        this.fetchFuncionariosPage(0, this.funcionariosPageSize());
      },
      error: () => {
        this.error = 'No se pudieron cargar funcionarios o roles';
        this.loadingCatalogs = false;
      },
    });
  }

  protected fetchFuncionariosPage(page: number, size: number, filter: string = ''): void {
    this.loadingFuncionarios.set(true);
    this.funcionarioService.findPaginated(page, size, filter).subscribe({
      next: (response) => {
        this.funcionarios.set(response.content);
        this.funcionariosTotal.set(response.pageInfo.totalElements);
        this.funcionariosPage.set(page);
        this.funcionariosPageSize.set(size);
        this.funcionariosFilter.set(filter);
        this.loadingFuncionarios.set(false);
      },
      error: () => {
        this.error = 'Error al cargar la página de funcionarios';
        this.loadingFuncionarios.set(false);
      }
    });
  }

  protected onFuncionarioSearchChange(filter: string): void {
    this.fetchFuncionariosPage(0, this.funcionariosPageSize(), filter);
  }

  protected onFuncionarioPageChange(event: PageChange): void {
    this.fetchFuncionariosPage(event.pageIndex, event.pageSize, this.funcionariosFilter());
  }

  /** Abre el alta de funcionario desde el buscador y recarga la lista al guardar. */
  protected onAddFuncionario(): void {
    this.dialogService.openForm(FuncionarioFormComponent, {
      title: 'Nuevo Funcionario',
      subtitle: 'Completa los datos para registrar un funcionario',
      maxWidth: '760px',
    }).subscribe((saved) => {
      if (saved) {
        this.fetchFuncionariosPage(0, this.funcionariosPageSize(), '');
      }
    });
  }

  protected funcionarioLabel(f: FuncionarioOutput): string {
    const nombre = `${f.persona?.nombre ?? ''} ${f.persona?.apellido ?? ''}`.trim();
    const doc = f.persona?.documento ?? '';
    return [nombre, doc].filter(Boolean).join(' — ') || `Funcionario #${f.id_funcionario}`;
  }

  protected readonly funcionarioLabelFn = (f: FuncionarioOutput) => this.funcionarioLabel(f);
  protected readonly funcionarioKeyFn = (f: FuncionarioOutput) => f.id_funcionario;

  protected isRoleSelected(roleId: string): boolean {
    return this.form.controls.roleIds.value.includes(roleId);
  }

  protected toggleRole(roleId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = [...this.form.controls.roleIds.value];
    if (checked) {
      if (!current.includes(roleId)) current.push(roleId);
    } else {
      const idx = current.indexOf(roleId);
      if (idx >= 0) current.splice(idx, 1);
    }
    this.form.controls.roleIds.setValue(current);
  }

  private readonly dialogRef = inject(DialogRef, { optional: true });

  protected onSubmit(): void {
    if (!this.isEdit && !this.form.controls.password.value.trim()) {
      this.form.controls.password.setErrors({ required: true });
      this.form.controls.password.markAsTouched();
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const u = this.usuario();
    const payload: UsuarioInput = {
      username: v.username.trim(),
      password: v.password?.trim() || null,
      email: v.email?.trim() || null,
      activo: v.activo,
      id_funcionario: v.id_funcionario,
      roleIds: v.roleIds,
    };

    this.saving = true;
    const request =
      u && u.id ? this.usuarioService.update(u.id, payload) : this.usuarioService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el usuario';
      },
    });
  }
}
