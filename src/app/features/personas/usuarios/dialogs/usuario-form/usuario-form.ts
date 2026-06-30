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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { FuncionarioOutput } from '../../../funcionarios/interfaces/funcionario.interface';
import { FuncionarioService } from '../../../funcionarios/services/funcionario.service';
import { RoleOutput } from '../../../roles/interfaces/role.interface';
import { RoleService } from '../../../roles/services/role.service';
import { UsuarioInput, UsuarioOutput } from '../../interfaces/usuario.interface';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './usuario-form.html',
  styleUrl: './usuario-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly funcionarioService = inject(FuncionarioService);
  private readonly roleService = inject(RoleService);

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
  protected readonly funcionariosOcupados = signal<Set<string>>(new Set());

  protected readonly funcionariosDisponibles = computed(() => {
    const ocupados = this.funcionariosOcupados();
    const actual = this.usuario()?.id_funcionario ?? null;
    return this.funcionarios().filter(
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
    forkJoin({
      roles: this.roleService.findAll(),
      funcionarios: this.funcionarioService.findAll(),
      usuarios: this.usuarioService.findAll(),
    }).subscribe({
      next: ({ roles, funcionarios, usuarios }) => {
        this.roles.set(roles);
        this.funcionarios.set(funcionarios);
        const actualId = this.usuario()?.id;
        const ocupados = new Set(
          usuarios
            .filter((u) => u.id_funcionario && u.id !== actualId)
            .map((u) => u.id_funcionario!)
        );
        this.funcionariosOcupados.set(ocupados);
        this.loadingCatalogs = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar funcionarios o roles';
        this.loadingCatalogs = false;
      },
    });
  }

  protected funcionarioLabel(f: FuncionarioOutput): string {
    const nombre = `${f.persona?.nombre ?? ''} ${f.persona?.apellido ?? ''}`.trim();
    const doc = f.persona?.documento ?? '';
    return [nombre, doc].filter(Boolean).join(' — ') || `Funcionario #${f.id_funcionario}`;
  }

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
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el usuario';
      },
    });
  }
}
