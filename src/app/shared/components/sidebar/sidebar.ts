import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { MenuItem } from '../../models/menu-item.model';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[@slideInOut]': '',
    class: 'sidebar-container'
  },
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)', width: '0px', opacity: 0 }),
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0)', width: '260px', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(-100%)', width: '0px', opacity: 0 }))
      ])
    ])
  ]
})
export class SidebarComponent {
  items = input<MenuItem[]>([]);
  title = input<string>('CH SERVICE');
  icon = input<string>('engineering');

  groupedItems = computed(() => {
    const list = this.items();
    const groups: { category: string; items: MenuItem[] }[] = [];
    list.forEach((item) => {
      const cat = item.category || '';
      let group = groups.find((g) => g.category === cat);
      if (!group) {
        group = { category: cat, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });
    return groups;
  });
}
