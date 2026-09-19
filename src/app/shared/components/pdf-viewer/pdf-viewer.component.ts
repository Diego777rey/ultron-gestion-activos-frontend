import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * Visor PDF genérico: muestra el documento en un iframe.
 * Recibe un object URL; no conoce el origen del documento.
 */
@Component({
  selector: 'app-pdf-viewer',
  template: `
    <iframe
      class="pdf-viewer__frame"
      [src]="safeSrc()"
      [title]="title()"
    ></iframe>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      min-width: 0;
      background: #525659;
    }

    .pdf-viewer__frame {
      flex: 1;
      min-height: 0;
      width: 100%;
      border: 0;
      background: #525659;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pdf-viewer-host' },
})
export class PdfViewerComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly src = input.required<string>();
  readonly title = input.required<string>();

  protected readonly safeSrc = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.src()),
  );
}
