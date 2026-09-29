import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FileUploadService } from './file-upload.service';

describe('FileUploadService', () => {
  let service: FileUploadService;
  let http: HttpTestingController;

  beforeEach(() => {
    delete window.ultronDesktop;
    window.ultronDesktop = { apiBaseUrl: 'http://167.99.15.121:8081' };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FileUploadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    delete window.ultronDesktop;
  });

  it('arma la URL pública del servidor configurado a partir de la ruta guardada', () => {
    expect(service.getFileUrl('productos/abc.jpg')).toBe(
      'http://167.99.15.121:8081/uploads/productos/abc.jpg',
    );
    expect(service.getFileUrl('/productos/mi foto.png')).toBe(
      'http://167.99.15.121:8081/uploads/productos/mi%20foto.png',
    );
    expect(service.getFileUrl(null)).toBe('');
    expect(service.getFileUrl('  ')).toBe('');
  });

  it('sube la imagen al servidor configurado y no a localhost', () => {
    const file = new File([new Uint8Array([1])], 'foto.jpg', { type: 'image/jpeg' });

    service.uploadFile(file, 'productos').subscribe();

    const req = http.expectOne('http://167.99.15.121:8081/api/files/upload');
    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).get('folder')).toBe('productos');
    req.flush({});
  });
});
