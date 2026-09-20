import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18n } from '../core/i18n';
import { Toast } from '../core/toast';
import { Icon, IconName } from '../shared/icon';
import { TPipe } from '../shared/t-pipe';

type NavItem = {
  path: string;
  labelKey: string;
  exact: boolean;
  icon: IconName;
  log?: boolean;
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, TPipe],
  templateUrl: './shell.html',
})
export class Shell {
  readonly toast = inject(Toast);
  readonly i18n = inject(I18n);
  readonly items: NavItem[] = [
    { path: '/', labelKey: 'nav.history', exact: true, icon: 'home' },
    { path: '/stats', labelKey: 'nav.stats', exact: false, icon: 'stats' },
    { path: '/log', labelKey: 'nav.log', exact: false, icon: 'log', log: true },
    { path: '/exercises', labelKey: 'nav.exercises', exact: false, icon: 'user' },
  ];
}
