import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { applyDocumentLocale } from './app/core/i18n';

applyDocumentLocale();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
