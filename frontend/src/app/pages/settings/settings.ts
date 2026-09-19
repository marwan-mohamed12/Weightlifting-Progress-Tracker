import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Toast } from '../../core/toast';
import { messageFrom } from '../../core/format';

@Component({
  selector: 'app-settings',
  imports: [RouterLink],
  templateUrl: './settings.html',
})
export class SettingsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);

  readonly notify = signal(true);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  ngOnInit() {
    this.api.getSettings().subscribe({
      next: (settings) => {
        this.notify.set(settings.notifyPersonalRecords);
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
    this.api.updateSettings({ notifyPersonalRecords: checked }).subscribe({
      next: () => this.toast.show(checked ? 'Record alerts on' : 'Record alerts off'),
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
            `${restore ? 'Restored' : 'Imported'} ${result.sessions} sessions, ${result.exercises} exercises.` +
              (result.warnings.length ? ' ' + result.warnings.join(' ') : ''),
          );
          this.toast.show(restore ? 'Backup restored' : 'Data imported');
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
          this.info.set(`Imported ${result.sessions} sessions from CSV.`);
          this.toast.show('CSV imported');
        },
        error: (err) => this.error.set(messageFrom(err)),
      });
    });
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
