import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TabService } from '../../services/tab.service';

@Component({
  selector: 'app-tabs',
  template: `
    <div class="tabs-header" role="tablist" aria-label="Pestañas abiertas">
      @for (tab of tabService.tabs(); track tab.id; let i = $index) {
        <div class="tab-label" [class.active]="tab.active">
          <button
            type="button"
            role="tab"
            class="tab-title"
            [attr.aria-selected]="tab.active"
            (click)="tabService.setTabActive(i)"
          >{{ tab.title }}</button>
          <button
            type="button"
            class="tab-close"
            [attr.aria-label]="'Cerrar ' + tab.title"
            (click)="tabService.removeTab(i)"
          >
            <span class="material-icons" aria-hidden="true">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .tabs-header {
      display: flex;
      align-items: stretch;
      background: var(--content-bg);
      min-height: 48px;
      overflow-x: auto;
    }
    .tab-label {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 160px;
      max-width: 250px;
      height: 48px;
      padding: 0 8px 0 14px;
      color: rgba(255, 255, 255, 0.6);
      background: var(--content-bg);
      border-right: 1px solid #222;
      border-bottom: 2px solid transparent;
      transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
    }
    .tab-label.active {
      color: #fff;
      background: #424242;
      border-bottom-color: var(--primary-color);
    }
    .tab-label:hover:not(.active) {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }
    .tab-title {
      flex: 1;
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 0.9em;
      font-weight: 500;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }
    .tab-title:focus-visible,
    .tab-close:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .tab-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: inherit;
      cursor: pointer;
      flex-shrink: 0;
    }
    .tab-close .material-icons {
      font-size: 16px;
      opacity: 0.6;
    }
    .tab-close:hover .material-icons {
      opacity: 1;
      color: #f44336;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  protected readonly tabService = inject(TabService);
}
