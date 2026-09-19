import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-stats-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="mb-5 grid grid-cols-4 gap-1 rounded-full bg-raised p-1" aria-label="Stats sections">
      <a
        routerLink="/stats"
        routerLinkActive="bg-plate text-on-plate"
        [routerLinkActiveOptions]="{ exact: true }"
        class="flex min-h-10 items-center justify-center rounded-full px-1 text-center text-xs font-semibold text-mute"
      >
        Overview
      </a>
      <a
        routerLink="/stats/exercise"
        routerLinkActive="bg-plate text-on-plate"
        class="flex min-h-10 items-center justify-center rounded-full px-1 text-center text-xs font-semibold text-mute"
      >
        Exercise
      </a>
      <a
        routerLink="/stats/muscles"
        routerLinkActive="bg-plate text-on-plate"
        class="flex min-h-10 items-center justify-center rounded-full px-1 text-center text-xs font-semibold text-mute"
      >
        Muscles
      </a>
      <a
        routerLink="/stats/records"
        routerLinkActive="bg-plate text-on-plate"
        class="flex min-h-10 items-center justify-center rounded-full px-1 text-center text-xs font-semibold text-mute"
      >
        Records
      </a>
    </nav>
  `,
})
export class StatsNav {}
