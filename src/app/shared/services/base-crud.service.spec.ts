import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BaseCrudService } from './base-crud.service';
import { GraphqlService } from './graphql.service';
import { CrudConfig } from '../models/crud-config.model';

interface Foo {
  id: number;
}
interface FooInput {
  name: string;
}

@Injectable()
class FooService extends BaseCrudService<Foo, FooInput> {
  protected readonly config: CrudConfig = {
    inputTypeName: 'FooInput',
    selectionSet: '{ id }',
    operations: {
      list: 'listarFoos',
      getById: 'buscarFoo',
      create: 'crearFoo',
      update: 'actualizarFoo',
      remove: 'eliminarFoo',
    },
  };
}

describe('BaseCrudService', () => {
  let service: FooService;
  let gql: { query: ReturnType<typeof vi.fn>; mutate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    gql = { query: vi.fn(), mutate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [FooService, { provide: GraphqlService, useValue: gql }],
    });
    service = TestBed.inject(FooService);
  });

  it('findAll queries the list operation and maps the result', () => {
    gql.query.mockReturnValue(of({ listarFoos: [{ id: 1 }, { id: 2 }] }));

    let result: Foo[] | undefined;
    service.findAll().subscribe((r) => (result = r));

    expect(gql.query.mock.calls[0][0]).toContain('listarFoos');
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('create sends the typed input variable and maps the result', () => {
    gql.mutate.mockReturnValue(of({ crearFoo: { id: 5 } }));

    let result: Foo | undefined;
    service.create({ name: 'demo' }).subscribe((r) => (result = r));

    const [doc, vars] = gql.mutate.mock.calls[0];
    expect(doc).toContain('crearFoo');
    expect(doc).toContain('FooInput');
    expect(vars).toEqual({ input: { name: 'demo' } });
    expect(result).toEqual({ id: 5 });
  });

  it('update sends id and input variables', () => {
    gql.mutate.mockReturnValue(of({ actualizarFoo: { id: 9 } }));

    service.update(9, { name: 'edit' }).subscribe();

    const [doc, vars] = gql.mutate.mock.calls[0];
    expect(doc).toContain('actualizarFoo');
    expect(vars).toEqual({ id: 9, input: { name: 'edit' } });
  });

  it('remove returns the boolean result', () => {
    gql.mutate.mockReturnValue(of({ eliminarFoo: true }));

    let result: boolean | undefined;
    service.remove(3).subscribe((r) => (result = r));

    expect(result).toBe(true);
  });
});
