import { Injectable } from '@angular/core';
import { BaseCrudService } from './base-crud.service';
import { CrudConfig } from '../models/crud-config.model';
import { ProveedorOutput, ProveedorInput } from '../models/compras.model';

const PROVEEDOR_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'ProveedorInput',
  selectionSet: `{
    id_proveedor
    tipo_persona
    nombre
    apellido
    razon_social
    nombre_comercial
    nombre_fantasia
    ruc
    documento
    direccion
    telefono
    email
    ciudad
    pais
    codigo_postal
    sitio_web
    observaciones
    activo
    fecha_registro
    fecha_ultima_modificacion
    nombre_completo
  }`,
  operations: {
    list: 'proveedores',
    getById: 'proveedor',
    create: 'registrarProveedor',
    update: 'actualizarProveedor',
    remove: 'eliminarProveedor',
  },
  entity: { label: 'Proveedor', gender: 'm' },
};

@Injectable({ providedIn: 'root' })
export class ProveedorService extends BaseCrudService<ProveedorOutput, ProveedorInput> {
  protected readonly config: CrudConfig = PROVEEDOR_CRUD_CONFIG;

  protected override resolveEntityName(entity: ProveedorOutput): string | undefined {
    if (entity.tipo_persona === 'FISICA') {
      return `${entity.nombre || ''} ${entity.apellido || ''}`.trim();
    }
    return entity.razon_social || undefined;
  }
}
