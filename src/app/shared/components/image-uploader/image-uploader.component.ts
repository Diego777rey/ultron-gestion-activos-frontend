import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadService } from '../../services/file-upload.service';

@Component({
  selector: 'app-image-uploader',
  imports: [CommonModule],
  templateUrl: './image-uploader.component.html',
  styleUrl: './image-uploader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUploaderComponent {
  private readonly fileUploadService = inject(FileUploadService);

  readonly currentImagePath = input<string | null>(null);
  readonly folder = input<string>('general');
  readonly label = input<string>('Imagen');
  readonly maxSizeMB = input<number>(5);
  readonly disabled = input<boolean>(false);

  readonly imageChange = output<string | null>();
  readonly uploadError = output<string>();

  protected readonly uploading = signal(false);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly fileName = signal<string | null>(null);

  protected readonly displayUrl = (() => {
    const current = this.currentImagePath();
    const preview = this.previewUrl();
    
    if (preview) return preview;
    if (current) return this.fileUploadService.getFileUrl(current);
    return null;
  });

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.uploadError.emit('Por favor, selecciona un archivo de imagen válido');
      input.value = '';
      return;
    }

    const maxSizeBytes = this.maxSizeMB() * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.uploadError.emit(`La imagen no debe superar ${this.maxSizeMB()}MB`);
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl.set(e.target?.result as string);
      this.fileName.set(file.name);
    };
    reader.readAsDataURL(file);

    this.uploadFile(file);
  }

  protected onRemoveImage(): void {
    this.previewUrl.set(null);
    this.fileName.set(null);
    this.imageChange.emit(null);
  }

  private uploadFile(file: File): void {
    this.uploading.set(true);

    this.fileUploadService.uploadFile(file, this.folder()).subscribe({
      next: (response) => {
        this.uploading.set(false);
        this.imageChange.emit(response.filePath);
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.emit('Error al subir la imagen. Por favor, intenta nuevamente.');
        this.previewUrl.set(null);
        this.fileName.set(null);
      },
    });
  }

  protected getCurrentImageUrl(): string | null {
    const current = this.currentImagePath();
    return current ? this.fileUploadService.getFileUrl(current) : null;
  }

  protected hasImage(): boolean {
    return !!this.previewUrl() || !!this.currentImagePath();
  }
}
