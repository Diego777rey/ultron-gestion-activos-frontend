import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ClienteFormComponent } from './cliente-form';
import { ClienteService } from '../../services/cliente.service';
import { ClienteInput, ClienteOutput } from '../../interfaces/cliente.interface';
import { PersonaService } from '../../../shared/services/persona.service';
import { ConsultaRucService, ContribuyenteRuc } from '../../../shared/services/consulta-ruc.service';

describe('ClienteFormComponent: flujo al ingresar CI/RUC', () => {
  let clienteExistente: ClienteOutput | null;
  let contribuyente: ContribuyenteRuc | null;
  let consultasDnit: number;
  let creado: ClienteInput | null;
  let actualizado: { id: string | number; input: ClienteInput } | null;

  beforeEach(() => {
    vi.useFakeTimers();
    clienteExistente = null;
    contribuyente = null;
    consultasDnit = 0;
    creado = null;
    actualizado = null;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ClienteService,
          useValue: {
            buscarPorDocumento: () => of(clienteExistente),
            create: (input: ClienteInput) => {
              creado = input;
              return of({ id_cliente: '99', persona: input.persona });
            },
            update: (id: string | number, input: ClienteInput) => {
              actualizado = { id, input };
              return of({ id_cliente: String(id), persona: input.persona });
            },
          },
        },
        {
          provide: PersonaService,
          useValue: { buscarPorDocumento: () => of({ buscarPersonaPorDocumento: null }) },
        },
        {
          provide: ConsultaRucService,
          useValue: {
            consultar: () => {
              consultasDnit += 1;
              return of(contribuyente);
            },
          },
        },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function crear() {
    const fixture = TestBed.createComponent(ClienteFormComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const escribir = (id: string, valor: string) => {
      const input = el.querySelector(`#${id}`) as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(600);
      fixture.detectChanges();
    };
    const valor = (id: string) => (el.querySelector(`#${id}`) as HTMLInputElement).value;
    const guardar = () => {
      (el.querySelector('.cliente-form-footer button') as HTMLButtonElement).click();
      fixture.detectChanges();
    };
    return { fixture, el, escribir, valor, guardar };
  }

  it('si ya es cliente carga sus datos, avisa y al guardar actualiza en vez de duplicar', () => {
    clienteExistente = {
      id_cliente: '7',
      ruc: '1234567-8',
      persona: { nombre: 'ANA PEREZ', documento: '1234567', telefono: '0981111222' },
    };
    const { fixture, el, escribir, valor, guardar } = crear();
    let existente: ClienteOutput | null = null;
    fixture.componentInstance.existente.subscribe((c) => (existente = c));

    escribir('documento', '1234567-8');

    expect(valor('nombre')).toBe('ANA PEREZ');
    expect(valor('telefono')).toBe('0981111222');
    expect(el.textContent).toContain('Ya es cliente');
    expect(existente).toEqual(clienteExistente);
    expect(consultasDnit).toBe(0);

    guardar();
    expect(actualizado?.id).toBe('7');
    expect(creado).toBeNull();
  });

  it('si figura en la DNIT completa el nombre y el RUC', () => {
    contribuyente = {
      ruc: '11584-3',
      documento: '11584',
      razonSocial: 'JARA GONZALEZ, FEDERICO',
      nombre: 'FEDERICO JARA GONZALEZ',
      estado: 'ACTIVO',
      activo: true,
      personaJuridica: false,
      entidadPublica: false,
    };
    const { el, escribir, valor, guardar } = crear();

    escribir('documento', '11584');

    expect(valor('nombre')).toBe('FEDERICO JARA GONZALEZ');
    expect(el.textContent).toContain('RUC 11584-3');
    guardar();
    expect(creado?.ruc).toBe('11584-3');
    expect(creado?.persona.nombre).toBe('FEDERICO JARA GONZALEZ');
  });

  it('si no aparece en ningún lado deja cargar el nombre a mano y lo guarda', () => {
    const { el, escribir, guardar } = crear();

    escribir('documento', '7654321');
    expect(el.textContent).toContain('consumidor final');

    escribir('nombre', 'CARLOS GOMEZ');
    guardar();
    expect(creado?.persona.documento).toBe('7654321');
    expect(creado?.persona.nombre).toBe('CARLOS GOMEZ');
  });

  it('no pisa un nombre corregido a mano', () => {
    contribuyente = {
      ruc: '11584-3',
      documento: '11584',
      razonSocial: 'JARA GONZALEZ, FEDERICO',
      nombre: 'FEDERICO JARA GONZALEZ',
      estado: 'ACTIVO',
      activo: true,
      personaJuridica: false,
      entidadPublica: false,
    };
    const { escribir, valor } = crear();

    escribir('nombre', 'FEDE JARA');
    escribir('documento', '11584');

    expect(valor('nombre')).toBe('FEDE JARA');
  });
});
