import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { formatDay, messageFrom, todayIso } from '../../core/format';
import { GymSession } from '../../core/models';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-history',
  imports: [RouterLink, Icon],
  templateUrl: './history.html',
})
export class HistoryPage implements OnInit {
  private readonly api = inject(Api);

  readonly sessions = signal<GymSession[]>([]);
  readonly selectedDay = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date());
  readonly week = weekDays();
  readonly activeId = signal<number | null>(null);

  readonly groups = computed(() => {
    const day = this.selectedDay();
    const grouped = new Map<string, GymSession[]>();
    for (const session of this.sessions()) {
      if (session.status === 'IN_PROGRESS') {
        continue;
      }
      if (day && session.performedOn !== day) {
        continue;
      }
      const bucket = grouped.get(session.performedOn) ?? [];
      bucket.push(session);
      grouped.set(session.performedOn, bucket);
    }
    return [...grouped.entries()].map(([date, items]) => ({
      date,
      label: formatDay(date),
      items,
    }));
  });

  readonly todayCount = computed(
    () => this.sessions().filter((session) => session.performedOn === todayIso() && session.status === 'COMPLETED').length,
  );

  ngOnInit() {
    this.reload();
  }

  selectDay(iso: string) {
    this.selectedDay.set(this.selectedDay() === iso ? null : iso);
  }

  accent(index: number): 'lime' | 'lilac' | 'blush' {
    return (['lime', 'lilac', 'blush'] as const)[index % 3];
  }

  reload() {
    this.loading.set(true);
    this.api.listSessions().subscribe({
      next: (rows) => {
        this.sessions.set(rows);
        const active = rows.find((row) => row.status === 'IN_PROGRESS');
        this.activeId.set(active?.id ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(messageFrom(err));
        this.loading.set(false);
      },
    });
  }
}

function weekDays() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const iso = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    return {
      iso,
      day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
      num: String(date.getDate()),
      today: iso === todayIso(),
    };
  });
}
