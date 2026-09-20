import { Component, OnInit, inject, signal } from '@angular/core';
import { Api } from '../../core/api';
import { formatDay, messageFrom } from '../../core/format';
import { ProgressOverview } from '../../core/models';
import { StatsNav } from './stats-nav';
import { TPipe } from '../../shared/t-pipe';

@Component({
  selector: 'app-stats-records',
  imports: [StatsNav, TPipe],
  templateUrl: './records.html',
})
export class RecordsPage implements OnInit {
  private readonly api = inject(Api);
  readonly overview = signal<ProgressOverview | null>(null);
  readonly error = signal<string | null>(null);
  readonly formatDay = formatDay;

  ngOnInit() {
    this.api.overview('all').subscribe({
      next: (overview) => this.overview.set(overview),
      error: (err) => this.error.set(messageFrom(err)),
    });
  }
}
