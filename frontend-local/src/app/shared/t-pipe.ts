import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18n, t } from '../core/i18n';

@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(key: string, params?: Record<string, string | number>): string {
    this.i18n.locale();
    return t(key, params);
  }
}
