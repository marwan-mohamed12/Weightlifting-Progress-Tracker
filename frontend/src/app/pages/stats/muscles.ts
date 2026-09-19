import { Component, OnInit, inject, signal } from '@angular/core';
import { Api } from '../../core/api';
import { formatKg, messageFrom } from '../../core/format';
import { ProgressOverview } from '../../core/models';
import { StatsNav } from './stats-nav';

@Component({
  selector: 'app-stats-muscles',
  imports: [StatsNav],
  templateUrl: './muscles.html',
})
export class MusclesPage implements OnInit {
  private readonly api = inject(Api);
  readonly overview = signal<ProgressOverview | null>(null);
  readonly error = signal<string | null>(null);
  readonly formatKg = formatKg;

  ngOnInit() {
    this.api.overview('all').subscribe({
      next: (overview) => this.overview.set(overview),
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  barWidth(value: number, max: number): string {
    if (!max) {
      return '8%';
    }
    return `${Math.max(8, Math.round((value / max) * 100))}%`;
  }
}
