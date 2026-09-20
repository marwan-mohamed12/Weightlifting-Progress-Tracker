import { Component, input, output } from '@angular/core';
import { TPipe } from './t-pipe';

@Component({
  selector: 'app-confirm',
  imports: [TPipe],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-[60] grid place-items-end p-4 sm:place-items-center"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/55"
          [attr.aria-label]="'common.dismiss' | t"
          (click)="cancelled.emit()"
        ></button>
        <div class="relative z-10 w-full max-w-md rounded-[2rem] bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <h2 [id]="titleId" class="m-0 font-display text-2xl uppercase tracking-wide">{{ title() }}</h2>
          <p class="mt-2 mb-5 text-mute">{{ message() }}</p>
          <div class="flex justify-end gap-2 rtl:flex-row-reverse">
            <button type="button" class="btn-ghost" (click)="cancelled.emit()">{{ 'common.cancel' | t }}</button>
            <button type="button" class="btn-danger" (click)="confirmed.emit()">{{ confirmLabel() }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input('Delete this?');
  readonly message = input('');
  readonly confirmLabel = input('Delete');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  readonly titleId = 'confirm-title';
}
