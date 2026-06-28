import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { GraphqlService } from './graphql.service';
import { API_CONFIG } from '../../config/api.config';

describe('GraphqlService', () => {
  let service: GraphqlService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GraphqlService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts to the GraphQL endpoint and returns data', () => {
    let result: { status: string } | undefined;
    service
      .query<{ status: string }>('query { status }')
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(API_CONFIG.graphqlEndpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.query).toContain('status');
    req.flush({ data: { status: 'OK' } });

    expect(result).toEqual({ status: 'OK' });
  });

  it('throws an error when the response contains GraphQL errors', () => {
    let error: Error | undefined;
    service.query('query { bad }').subscribe({ error: (e: Error) => (error = e) });

    const req = httpMock.expectOne(API_CONFIG.graphqlEndpoint);
    req.flush({ errors: [{ message: 'Campo invalido' }] });

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toContain('Campo invalido');
  });

  it('sends variables for mutations', () => {
    service
      .mutate('mutation($id: ID!) { eliminar(id: $id) }', { id: 7 })
      .subscribe();

    const req = httpMock.expectOne(API_CONFIG.graphqlEndpoint);
    expect(req.request.body.variables).toEqual({ id: 7 });
    req.flush({ data: { eliminar: true } });
  });
});
