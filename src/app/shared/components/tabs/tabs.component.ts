import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TabService } from '../../services/tab.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tabs',
  imports: [CommonModule],
  template: `
    <div class="tabs-header">
      @for (tab of tabService.tabs(); track tab.id; let i = $index) {
        <div 
          class="tab-label" 
          [class.active]="tab.active" 
          (click)="tabService.setTabActive(i)"
        >
          <span class="tab-title">{{ tab.title }}</span>
          <span 
            class="material-icons close-icon" 
            (click)="tabService.removeTab(i); $event.stopPropagation()"
          >close</span>
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
      background: #333333;
      min-height: 48px;
      overflow-x: auto;
      border-bottom: 1px solid #222;
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
      padding: 0 14px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.6);
      background: #333;
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
      font-size: 0.9em;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .close-icon {
      font-size: 16px;
      opacity: 0.6;
      border-radius: 50%;
      padding: 2px;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .close-icon:hover {
      opacity: 1;
      color: #f44336;
      background: rgba(244, 67, 54, 0.15);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  protected readonly tabService = inject(TabService);
}
