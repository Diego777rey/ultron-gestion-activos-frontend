import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FileUploadResponse } from '../models/file-upload.model';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8081/api/files';

  uploadFile(file: File, folder: string = 'general'): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return this.http.post<FileUploadResponse>(`${this.API_URL}/upload`, formData);
  }

  deleteFile(filePath: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/delete`, {
      params: { filePath }
    });
  }

  getFileUrl(filePath: string): string {
    if (!filePath) return '';
    return `${this.API_URL}/download?filePath=${encodeURIComponent(filePath)}`;
  }
}
