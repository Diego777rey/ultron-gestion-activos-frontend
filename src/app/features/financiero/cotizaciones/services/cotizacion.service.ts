import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { COTIZACION_CRUD_CONFIG, LISTAR_COTIZACIONES_ACTIVAS } from '../graphql/cotizacion.graphql';
import { CotizacionInput, CotizacionOutput } from '../interfaces/cotizacion.interface';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CotizacionService extends BaseCrudService<CotizacionOutput, CotizacionInput> {
  protected readonly config: CrudConfig = COTIZACION_CRUD_CONFIG;

  protected override resolveEntityName(entity: CotizacionOutput): string | undefined {
    return entity.moneda?.trim() || undefined;
  }
  
  listarCotizacionesActivas(): Observable<CotizacionOutput[]> {
    return this.apollo
      .query<{ listarCotizacionesActivas: CotizacionOutput[] }>({
        query: this.gql.parse(LISTAR_COTIZACIONES_ACTIVAS),
      })
      .pipe(map((result) => result.data.listarCotizacionesActivas));
  }
}
