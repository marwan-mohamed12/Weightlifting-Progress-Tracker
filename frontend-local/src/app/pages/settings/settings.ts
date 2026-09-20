import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Toast } from '../../core/toast';
import { messageFrom } from '../../core/format';
import { I18n, t } from '../../core/i18n';
import { AppSettings } from '../../core/models';
import { Locale } from '../../core/translations';
import { TPipe } from '../../shared/t-pipe';

@Component({
  selector: 'app-settings',
  imports: [RouterLink, TPipe],
  templateUrl: './settings.html',
})
export class SettingsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  readonly i18n = inject(I18n);

  readonly notify = signal(true);
  readonly restSeconds = signal(90);
  readonly restChoices = [0, 60, 90, 120, 180];
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  ngOnInit() {
    this.api.getSettings().subscribe({
      next: (settings) => {
        this.notify.set(settings.notifyPersonalRecords);
        this.restSeconds.set(settings.restTimerSeconds ?? 90);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(messageFrom(err));
        this.loading.set(false);
      },
    });
  }

  toggle(checked: boolean) {
    this.notify.set(checked);
    this.saveSettings(checked, this.restSeconds(), checked ? t('toast.alertsOn') : t('toast.alertsOff'));
  }

  setRest(seconds: number) {
    this.restSeconds.set(seconds);
    this.saveSettings(this.notify(), seconds);
  }

  restLabel(seconds: number): string {
    if (seconds === 0) {
      return t('log.restOff');
    }
    const minutes = Math.floor(seconds / 60);
    const leftover = seconds % 60;
    return leftover ? `${minutes}:${String(leftover).padStart(2, '0')}` : `${minutes}:00`;
  }

  private saveSettings(notify: boolean, restTimerSeconds: number, toast?: string) {
    this.api.updateSettings({ notifyPersonalRecords: notify, restTimerSeconds } as AppSettings).subscribe({
      next: () => {
        if (toast) {
          this.toast.show(toast);
        }
      },
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  exportJson() {
    this.api.downloadJson().subscribe({
      next: (blob) => saveBlob(blob, 'plate-backup.json'),
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  exportCsv() {
    this.api.downloadCsv().subscribe({
      next: (blob) => saveBlob(blob, 'plate-workouts.csv'),
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  onJsonFile(event: Event, restore: boolean) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    file.text().then((text) => {
      const payload = JSON.parse(text);
      const request = restore ? this.api.restore(payload) : this.api.importJson(payload);
      request.subscribe({
        next: (result) => {
          this.info.set(
            t(restore ? 'settings.restored' : 'settings.imported', {
              sessions: result.sessions,
              exercises: result.exercises,
            }) + (result.warnings.length ? ' ' + result.warnings.join(' ') : ''),
          );
          this.toast.show(restore ? t('toast.backupRestored') : t('toast.dataImported'));
        },
        error: (err) => this.error.set(messageFrom(err)),
      });
    });
  }

  onCsvFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    file.text().then((text) => {
      this.api.importCsv(text).subscribe({
        next: (result) => {
          this.info.set(t('settings.csvImported', { sessions: result.sessions }));
          this.toast.show(t('toast.csvImported'));
        },
        error: (err) => this.error.set(messageFrom(err)),
      });
    });
  }

  setLanguage(next: Locale) {
    this.i18n.setLocale(next);
  }
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
