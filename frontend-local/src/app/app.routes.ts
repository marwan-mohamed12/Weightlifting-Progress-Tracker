import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/history/history').then((m) => m.HistoryPage),
  },
  {
    path: 'log',
    loadComponent: () => import('./pages/log/log').then((m) => m.LogPage),
  },
  {
    path: 'log/:id',
    loadComponent: () => import('./pages/log/log').then((m) => m.LogPage),
  },
  {
    path: 'exercises',
    loadComponent: () => import('./pages/exercises/exercises').then((m) => m.ExercisesPage),
  },
  {
    path: 'stats',
    loadComponent: () => import('./pages/stats/stats').then((m) => m.StatsPage),
  },
  {
    path: 'stats/exercise',
    loadComponent: () => import('./pages/stats/exercise-stats').then((m) => m.ExerciseStatsPage),
  },
  {
    path: 'stats/muscles',
    loadComponent: () => import('./pages/stats/muscles').then((m) => m.MusclesPage),
  },
  {
    path: 'stats/records',
    loadComponent: () => import('./pages/stats/records').then((m) => m.RecordsPage),
  },
  {
    path: 'templates',
    loadComponent: () => import('./pages/templates/templates').then((m) => m.TemplatesPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
  },
  { path: '**', redirectTo: '' },
];
