import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { FileUploadResponse } from '../models/file-upload.model';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private readonly http = inject(HttpClient);

  uploadFile(file: File, folder: string = 'general'): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return this.http.post<FileUploadResponse>(`${API_CONFIG.filesEndpoint}/upload`, formData);
  }

  deleteFile(filePath: string): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.filesEndpoint}/delete`, {
      params: { filePath }
    });
  }

  /** Arma la URL pública de una ruta guardada en la base (p. ej. `productos/<uuid>.jpg`). */
  getFileUrl(filePath: string | null | undefined): string {
    const path = filePath?.trim().replace(/^\/+/, '');
    if (!path) return '';
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    return `${API_CONFIG.uploadsBaseUrl}/${encoded}`;
  }
}
