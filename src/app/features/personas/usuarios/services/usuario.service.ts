import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { USUARIO_CRUD_CONFIG } from '../graphql/usuario.graphql';
import { UsuarioInput, UsuarioOutput } from '../interfaces/usuario.interface';

@Injectable({ providedIn: 'root' })
export class UsuarioService extends BaseCrudService<UsuarioOutput, UsuarioInput> {
  protected readonly config: CrudConfig = USUARIO_CRUD_CONFIG;

  protected override resolveEntityName(entity: UsuarioOutput): string | undefined {
    return entity.username?.trim() || undefined;
  }

  agregarRol(usuarioId: string, roleId: string): Observable<UsuarioOutput> {
    const document = `mutation($usuarioId: ID!, $roleId: ID!) {
      agregarRolAUsuario(usuarioId: $usuarioId, roleId: $roleId) ${this.config.selectionSet}
    }`;
    return this.gql
      .mutate<Record<string, UsuarioOutput>>(document, { usuarioId, roleId })
      .pipe(map((data) => data['agregarRolAUsuario']));
  }

  quitarRol(usuarioId: string, roleId: string): Observable<UsuarioOutput> {
    const document = `mutation($usuarioId: ID!, $roleId: ID!) {
      quitarRolDeUsuario(usuarioId: $usuarioId, roleId: $roleId) ${this.config.selectionSet}
    }`;
    return this.gql
      .mutate<Record<string, UsuarioOutput>>(document, { usuarioId, roleId })
      .pipe(map((data) => data['quitarRolDeUsuario']));
  }

  rolesUsuarioPaginado(usuarioId: string, page: number, size: number, filter: string = ''): Observable<any> {
    const document = `query($usuarioId: ID!, $page: Int!, $size: Int!, $filter: String) {
      rolesUsuarioPaginado(usuarioId: $usuarioId, page: $page, size: $size, filter: $filter) {
        content { id descripcion activo }
        pageInfo { totalElements totalPages }
      }
    }`;
    return this.gql
      .query<Record<string, any>>(document, { usuarioId, page, size, filter })
      .pipe(map((data) => data['rolesUsuarioPaginado']));
  }

  rolesDisponiblesUsuarioPaginado(usuarioId: string, page: number, size: number, filter: string = ''): Observable<any> {
    const document = `query($usuarioId: ID!, $page: Int!, $size: Int!, $filter: String) {
      rolesDisponiblesUsuarioPaginado(usuarioId: $usuarioId, page: $page, size: $size, filter: $filter) {
        content { id descripcion activo }
        pageInfo { totalElements totalPages }
      }
    }`;
    return this.gql
      .query<Record<string, any>>(document, { usuarioId, page, size, filter })
      .pipe(map((data) => data['rolesDisponiblesUsuarioPaginado']));
  }
}
