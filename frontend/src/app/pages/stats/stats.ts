import { Component, OnInit, inject, signal } from '@angular/core';
import { Api } from '../../core/api';
import { formatKg, messageFrom } from '../../core/format';
import { ProgressOverview } from '../../core/models';
import { StatsNav } from './stats-nav';

@Component({
  selector: 'app-stats',
  imports: [StatsNav],
  templateUrl: './stats.html',
})
export class StatsPage implements OnInit {
  private readonly api = inject(Api);

  readonly range = signal('30d');
  readonly overview = signal<ProgressOverview | null>(null);
  readonly error = signal<string | null>(null);
  readonly formatKg = formatKg;

  readonly ranges = [
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
    { id: '90d', label: '3m' },
    { id: '6m', label: '6m' },
    { id: '1y', label: '1y' },
    { id: '30m', label: '30m' },
    { id: 'all', label: 'All' },
  ];

  ngOnInit() {
    this.loadOverview();
  }

  setRange(id: string) {
    this.range.set(id);
    this.loadOverview();
  }

  loadOverview() {
    this.api.overview(this.range()).subscribe({
      next: (overview) => this.overview.set(overview),
      error: (err) => this.error.set(messageFrom(err)),
    });
  }
}
