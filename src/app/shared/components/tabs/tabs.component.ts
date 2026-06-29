import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TabService } from '../../services/tab.service';

@Component({
  selector: 'app-tabs',
  imports: [NgComponentOutlet],
  template: `
    <div class="tabs-container">
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
      <div class="tabs-content">
        @for (tab of tabService.tabs(); track tab.id) {
          <div class="tab-pane" [class.active]="tab.active">
            @if (tab.active) {
              <ng-container *ngComponentOutlet="tab.component; inputs: tab.tabData?.data" />
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }
    .tabs-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }
    .tabs-header {
      display: flex;
      align-items: stretch;
      background: #424242;
      min-height: 48px;
      overflow-x: auto;
    }
    .tab-label {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 200px;
      max-width: 250px;
      height: 48px;
      padding: 0 14px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.7);
      background: #424242;
      border-right: none;
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
      background: rgba(255, 255, 255, 0.06);
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
      font-size: 18px;
      opacity: 0.7;
      border-radius: 50%;
      padding: 2px;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .close-icon:hover {
      opacity: 1;
      color: #f44336;
      background: rgba(244, 67, 54, 0.12);
    }
    .tabs-content {
      flex: 1;
      min-height: 0;
      position: relative;
      overflow: hidden;
      background: rgb(70, 70, 70);
    }
    .tab-pane {
      display: none;
    }
    .tab-pane.active {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .tab-pane.active > * {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  protected readonly tabService = inject(TabService);
}
