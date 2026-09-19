import { Component, input } from '@angular/core';

export type IconName =
  | 'home'
  | 'history'
  | 'log'
  | 'exercises'
  | 'user'
  | 'stats'
  | 'plus'
  | 'trash'
  | 'check'
  | 'close'
  | 'chevron'
  | 'search'
  | 'trend-up'
  | 'trend-down'
  | 'trend-flat'
  | 'trend-wait'
  | 'settings';

@Component({
  selector: 'app-icon',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" class="size-[1.35rem] fill-none stroke-current">
      @switch (name()) {
        @case ('home') {
          <path d="M4 10.5 12 4l8 6.5V20h-6v-6H10v6H4z" />
        }
        @case ('user') {
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19c1.4-3 3.8-4.5 7-4.5s5.6 1.5 7 4.5" />
        }
        @case ('history') {
          <path d="M4 6h16M4 12h16M4 18h10" />
        }
        @case ('log') {
          <path d="M3 12h3M18 12h3M8 12h8M7 8v8M17 8v8M5 10v4M19 10v4" />
        }
        @case ('exercises') {
          <path d="M4 7h16M4 12h16M4 17h10" />
          <circle cx="18" cy="17" r="2" />
        }
        @case ('stats') {
          <path d="M5 19V9M12 19V5M19 19v-7" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('trash') {
          <path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12" />
        }
        @case ('check') {
          <path d="M5 12l5 5 9-10" />
        }
        @case ('close') {
          <path d="M6 6l12 12M18 6L6 18" />
        }
        @case ('chevron') {
          <path d="M9 6l6 6-6 6" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="6" />
          <path d="M16 16l4 4" />
        }
        @case ('trend-up') {
          <path d="M4 16l6-6 4 4 6-8" />
          <path d="M14 6h6v6" />
        }
        @case ('trend-down') {
          <path d="M4 8l6 6 4-4 6 8" />
          <path d="M14 18h6v-6" />
        }
        @case ('trend-flat') {
          <path d="M4 12h16" />
        }
        @case ('trend-wait') {
          <circle cx="12" cy="12" r="7" />
          <path d="M12 8v5l3 2" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2M12 19v2M4.9 6.5l1.7 1.7M17.4 15.8l1.7 1.7M3 12h2M19 12h2M4.9 17.5l1.7-1.7M17.4 8.2l1.7-1.7" />
        }
      }
    </svg>
  `,
  styles: `
    svg {
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
}
