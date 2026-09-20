import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TPipe } from '../../shared/t-pipe';

@Component({
  selector: 'app-stats-nav',
  imports: [RouterLink, RouterLinkActive, TPipe],
  template: `
    <nav class="mb-5 grid grid-cols-4 gap-1 rounded-full bg-raised p-1" [attr.aria-label]="'stats.sections' | t">
      <a
        routerLink="/stats"
        routerLinkActive="bg-plate text-on-plate"
        [routerLinkActiveOptions]="{ exact: true }"
        class="flex min-h-10 items-center justify-center rounded-full px-1 text-center text-xs font-semibold text-mute"
      >
        {{ 'stats.overview' | t }}
      </a>
      <a
        routerLink="/stats/exercise"
        routerLinkActive="bg-plate text-on-plate"
        class="flex min-h-10 items-center justify-center rounded-full px-1 text-center text-xs font-semibold text-mute"
      >
        {{ 'stats.exercise' | t }}
      </a>
      <a
        routerLink="/stats/muscles"
        routerLinkActive="bg-plate text-on-plate"
        class="flex min-h-10 items-center justify-center rounded-full px-1 text-center text-xs font-semibold text-mute"
      >
        {{ 'stats.muscles' | t }}
      </a>
      <a
        routerLink="/stats/records"
        routerLinkActive="bg-plate text-on-plate"
        class="flex min-h-10 items-center justify-center rounded-full px-1 text-center text-xs font-semibold text-mute"
      >
        {{ 'stats.records' | t }}
      </a>
    </nav>
  `,
})
export class StatsNav {}
