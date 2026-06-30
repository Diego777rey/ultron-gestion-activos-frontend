import { RoleOutput } from '../../roles/interfaces/role.interface';
import { FuncionarioOutput } from '../../funcionarios/interfaces/funcionario.interface';

export interface UsuarioOutput {
  id?: string | null;
  username?: string | null;
  email?: string | null;
  activo?: boolean | null;
  id_funcionario?: string | null;
  funcionario?: FuncionarioOutput | null;
  roles?: RoleOutput[] | null;
}

export interface UsuarioInput {
  username: string;
  password?: string | null;
  email?: string | null;
  activo?: boolean | null;
  id_funcionario: string;
  roleIds?: string[] | null;
}
