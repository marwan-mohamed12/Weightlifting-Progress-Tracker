import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toast } from '../core/toast';
import { Icon, IconName } from '../shared/icon';

type NavItem = {
  path: string;
  label: string;
  exact: boolean;
  icon: IconName;
  log?: boolean;
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './shell.html',
})
export class Shell {
  readonly toast = inject(Toast);
  readonly items: NavItem[] = [
    { path: '/', label: 'History', exact: true, icon: 'home' },
    { path: '/stats', label: 'Stats', exact: false, icon: 'stats' },
    { path: '/log', label: 'Log', exact: false, icon: 'log', log: true },
    { path: '/exercises', label: 'Exercises', exact: false, icon: 'user' },
  ];
}
