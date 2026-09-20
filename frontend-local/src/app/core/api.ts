import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from './api-error';
import { localDb } from './local-db';
import {
  AppSettings,
  Exercise,
  ExerciseStats,
  ExerciseWrite,
  FinishResponse,
  GymSession,
  ImportResult,
  ProgressOverview,
  SessionWrite,
  TemplateWrite,
  WorkoutTemplate,
} from './models';

export { ApiError } from './api-error';

@Injectable({ providedIn: 'root' })
export class Api {
  listExercises(): Observable<Exercise[]> {
    return this.run(() => localDb.listExercises());
  }

  getExercise(id: number): Observable<Exercise> {
    return this.run(() => localDb.getExercise(id));
  }

  createExercise(body: ExerciseWrite): Observable<Exercise> {
    return this.run(() => localDb.createExercise(body));
  }

  updateExercise(id: number, body: ExerciseWrite): Observable<Exercise> {
    return this.run(() => localDb.updateExercise(id, body));
  }

  deleteExercise(id: number): Observable<void> {
    return this.run(() => localDb.deleteExercise(id));
  }

  toggleFavorite(id: number): Observable<Exercise> {
    return this.run(() => localDb.toggleFavorite(id));
  }

  lastSetForExercise(id: number): Observable<{ weightKg: number; reps: number } | null> {
    return this.run(() => localDb.lastSetForExercise(id));
  }

  listSessions(): Observable<GymSession[]> {
    return this.run(() => localDb.listSessions());
  }

  activeSession(): Observable<GymSession | null> {
    return this.run(() => localDb.activeSession());
  }

  getSession(id: number): Observable<GymSession> {
    return this.run(() => localDb.getSession(id));
  }

  startSession(performedOn?: string): Observable<GymSession> {
    return this.run(() => localDb.startSession(performedOn));
  }

  startFromTemplate(templateId: number, performedOn?: string): Observable<GymSession> {
    return this.run(() => localDb.startFromTemplate(templateId, performedOn));
  }

  saveSession(id: number, body: SessionWrite): Observable<GymSession> {
    return this.run(() => localDb.saveSession(id, body));
  }

  finishSession(id: number, body: SessionWrite): Observable<FinishResponse> {
    return this.run(() => localDb.finishSession(id, body));
  }

  deleteSession(id: number): Observable<void> {
    return this.run(() => localDb.deleteSession(id));
  }

  exerciseStats(id: number): Observable<ExerciseStats> {
    return this.run(() => localDb.exerciseStats(id));
  }

  overview(range: string): Observable<ProgressOverview> {
    return this.run(() => localDb.overview(range));
  }

  listTemplates(): Observable<WorkoutTemplate[]> {
    return this.run(() => localDb.listTemplates());
  }

  createTemplate(body: TemplateWrite): Observable<WorkoutTemplate> {
    return this.run(() => localDb.createTemplate(body));
  }

  updateTemplate(id: number, body: TemplateWrite): Observable<WorkoutTemplate> {
    return this.run(() => localDb.updateTemplate(id, body));
  }

  deleteTemplate(id: number): Observable<void> {
    return this.run(() => localDb.deleteTemplate(id));
  }

  downloadJson(): Observable<Blob> {
    return this.run(() => {
      const json = JSON.stringify(localDb.exportJson(), null, 2);
      return new Blob([json], { type: 'application/json' });
    });
  }

  downloadCsv(): Observable<Blob> {
    return this.run(() => new Blob([localDb.exportCsv()], { type: 'text/csv' }));
  }

  importJson(body: unknown): Observable<ImportResult> {
    return this.run(() => localDb.importJson(body));
  }

  restore(body: unknown): Observable<ImportResult> {
    return this.run(() => localDb.restore(body));
  }

  importCsv(csv: string): Observable<ImportResult> {
    return this.run(() => localDb.importCsv(csv));
  }

  getSettings(): Observable<AppSettings> {
    return this.run(() => localDb.getSettings());
  }

  updateSettings(body: AppSettings): Observable<AppSettings> {
    return this.run(() => localDb.updateSettings(body));
  }

  private run<T>(fn: () => T): Observable<T> {
    try {
      return of(fn());
    } catch (err) {
      if (err instanceof ApiError) {
        return throwError(() => err);
      }
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      return throwError(() => new ApiError(message, 'SERVER_ERROR', 500));
    }
  }
}
