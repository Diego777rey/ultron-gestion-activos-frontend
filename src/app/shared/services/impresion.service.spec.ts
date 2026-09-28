import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ImpresionService } from './impresion.service';
import { GraphqlService } from './graphql.service';
import { NotificationService } from './notification.service';
import { ConfiguracionService } from './configuracion.service';

describe('ImpresionService', () => {
  let service: ImpresionService;
  let gql: { query: ReturnType<typeof vi.fn>; mutate: ReturnType<typeof vi.fn> };
  let notifications: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    gql = {
      query: vi.fn(),
      mutate: vi.fn(),
    };
    notifications = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ImpresionService,
        { provide: GraphqlService, useValue: gql },
        { provide: NotificationService, useValue: notifications },
        {
          provide: ConfiguracionService,
          useValue: {
            getConfig: () => ({
              serverIp: 'localhost',
              serverPort: '8081',
              isConfigured: true,
              printers: { ticket: 'TICKET58' },
            }),
          },
        },
      ],
    });

    service = TestBed.inject(ImpresionService);
    delete window.ultronDesktop;
  });

  it('usa la impresora configurada', () => {
    expect(service.getConfiguredPrinterName()).toBe('TICKET58');
    expect(service.hasConfiguredPrinter()).toBe(true);
  });

  it('pide las impresoras al backend si Electron no está disponible', () => {
    gql.query.mockReturnValue(of({
      listarImpresoras: [{ name: 'TICKET58', displayName: 'TICKET58', isDefault: true }],
    }));

    let printers: unknown;
    service.listarImpresoras().subscribe((value) => {
      printers = value;
    });

    expect(printers).toEqual([
      { name: 'TICKET58', displayName: 'TICKET58', isDefault: true },
    ]);
  });

  it('avisa si no hay impresora para imprimir el ticket', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ImpresionService,
        { provide: GraphqlService, useValue: gql },
        { provide: NotificationService, useValue: notifications },
        {
          provide: ConfiguracionService,
          useValue: {
            getConfig: () => ({
              serverIp: 'localhost',
              serverPort: '8081',
              isConfigured: true,
              printers: { ticket: '' },
            }),
          },
        },
      ],
    });
    const withoutPrinter = TestBed.inject(ImpresionService);

    withoutPrinter.imprimirTicketVenta({
      lineas: [{ descripcion: 'Item', cantidad: 1, precioUnitario: 1000, subtotal: 1000 }],
      total: 1000,
    }).subscribe((result) => {
      expect(result.success).toBe(false);
    });

    expect(notifications.warning).toHaveBeenCalled();
    expect(gql.mutate).not.toHaveBeenCalled();
  });

  it('imprime el ticket en la impresora de esta computadora', async () => {
    const printRaw = vi.fn().mockResolvedValue({
      success: true,
      message: 'Ticket enviado a la impresora (TICKET58)',
    });
    window.ultronDesktop = {
      apiBaseUrl: 'https://api.example/',
      printRaw,
    };

    let result: { success: boolean } | undefined;
    service.imprimirTicketVenta({
      lineas: [{ descripcion: 'Item', cantidad: 1, precioUnitario: 1000, subtotal: 1000 }],
      total: 1000,
    }).subscribe((value) => {
      result = value;
    });

    await vi.waitFor(() => expect(result?.success).toBe(true));
    expect(printRaw).toHaveBeenCalledOnce();
    expect(printRaw.mock.calls[0][0]).toBe('TICKET58');
    expect(printRaw.mock.calls[0][1]).toBeInstanceOf(Uint8Array);
    expect(gql.mutate).not.toHaveBeenCalled();
    expect(notifications.success).toHaveBeenCalled();
  });

  it('lista las impresoras del equipo cuando hay aplicación de escritorio', async () => {
    window.ultronDesktop = {
      apiBaseUrl: 'https://api.example/',
      printRaw: vi.fn(),
      getPrinters: () => Promise.resolve([
        { name: 'POS58', displayName: 'POS58', isDefault: true },
      ]),
    };

    let printers: { name: string }[] | undefined;
    service.listarImpresoras().subscribe((value) => {
      printers = value;
    });

    await vi.waitFor(() => expect(printers?.[0]?.name).toBe('POS58'));
    expect(gql.query).not.toHaveBeenCalled();
  });
});
