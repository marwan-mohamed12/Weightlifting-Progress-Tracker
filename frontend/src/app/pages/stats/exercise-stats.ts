import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { formatDay, formatKg, messageFrom, trendCopy } from '../../core/format';
import { Exercise, ExerciseStats, SessionSnapshot } from '../../core/models';
import { Icon, IconName } from '../../shared/icon';
import { LineChart } from '../../shared/line-chart';
import { StatsNav } from './stats-nav';

@Component({
  selector: 'app-exercise-stats',
  imports: [RouterLink, Icon, LineChart, StatsNav],
  templateUrl: './exercise-stats.html',
})
export class ExerciseStatsPage implements OnInit {
  private readonly api = inject(Api);

  readonly exercises = signal<Exercise[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly stats = signal<ExerciseStats | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly menuOpen = signal(false);
  readonly query = signal('');
  readonly chart = signal<'weight' | 'reps' | 'volume'>('weight');

  readonly selectedName = computed(() => {
    const id = this.selectedId();
    return this.exercises().find((exercise) => exercise.id === id)?.name ?? 'Pick an exercise';
  });

  readonly filteredExercises = computed(() => {
    const q = this.query().trim().toLowerCase();
    const rows = this.exercises();
    if (!q) {
      return rows;
    }
    return rows.filter((exercise) => exercise.name.toLowerCase().includes(q));
  });

  readonly formatKg = formatKg;
  readonly formatDay = formatDay;
  readonly trendCopy = trendCopy;

  readonly chartChronological = computed(() => {
    const sessions = this.stats()?.trend.sessions ?? [];
    return [...sessions].reverse();
  });

  readonly activeSeries = computed(() => {
    const rows = this.chartChronological();
    switch (this.chart()) {
      case 'reps':
        return rows.map((row) => row.totalReps);
      case 'volume':
        return rows.map((row) => row.totalVolume);
      default:
        return rows.map((row) => row.maxWeightKg);
    }
  });

  readonly activeColor = computed(() => {
    switch (this.chart()) {
      case 'reps':
        return '#c9b6ff';
      case 'volume':
        return '#f3b4d0';
      default:
        return '#c8f247';
    }
  });

  readonly activeTitle = computed(() => {
    switch (this.chart()) {
      case 'reps':
        return 'Reps over time';
      case 'volume':
        return 'Volume over time';
      default:
        return 'Weight over time';
    }
  });

  ngOnInit() {
    this.api.listExercises().subscribe({
      next: (rows) => {
        this.exercises.set(rows);
        if (rows[0]) {
          this.select(rows[0].id);
        }
      },
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  toggleMenu() {
    if (this.exercises().length === 0) {
      return;
    }
    this.menuOpen.update((open) => !open);
    if (this.menuOpen()) {
      this.query.set('');
    }
  }

  closeMenu() {
    this.menuOpen.set(false);
    this.query.set('');
  }

  onQuery(value: string) {
    this.query.set(value);
  }

  onSearchKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeMenu();
      return;
    }
    if (event.key === 'Enter') {
      const first = this.filteredExercises()[0];
      if (first) {
        this.pick(first.id);
      }
    }
  }

  pick(id: number) {
    this.closeMenu();
    this.select(id);
  }

  select(id: number) {
    this.selectedId.set(id);
    this.loading.set(true);
    this.api.exerciseStats(id).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(messageFrom(err));
        this.loading.set(false);
      },
    });
  }

  trendIcon(direction: string): IconName {
    switch (direction) {
      case 'up':
        return 'trend-up';
      case 'down':
        return 'trend-down';
      case 'stable':
        return 'trend-flat';
      default:
        return 'trend-wait';
    }
  }

  barWidth(value: number, max: number): string {
    if (!max) {
      return '8%';
    }
    return `${Math.max(8, Math.round((value / max) * 100))}%`;
  }

  maxWeight(sessions: SessionSnapshot[]): number {
    return sessions.reduce((highest, session) => Math.max(highest, session.maxWeightKg), 0);
  }
}
