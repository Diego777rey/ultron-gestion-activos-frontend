import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe genérico que muestra un texto de marcador cuando el valor es nulo/vacío.
 * Evita celdas en blanco en tablas y formularios.
 *
 * Uso: `cliente.email | defaultEmpty` o `valor | defaultEmpty:'Sin datos'`
 */
@Pipe({ name: 'defaultEmpty' })
export class DefaultEmptyPipe implements PipeTransform {
  transform(value: unknown, placeholder = '—'): string {
    if (value === null || value === undefined) {
      return placeholder;
    }
    const text = String(value).trim();
    return text.length ? text : placeholder;
  }
}
