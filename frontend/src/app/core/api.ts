import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
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

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  listExercises(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(`${this.base}/exercises`).pipe(catchError(readError));
  }

  getExercise(id: number): Observable<Exercise> {
    return this.http.get<Exercise>(`${this.base}/exercises/${id}`).pipe(catchError(readError));
  }

  createExercise(body: ExerciseWrite): Observable<Exercise> {
    return this.http.post<Exercise>(`${this.base}/exercises`, body).pipe(catchError(readError));
  }

  updateExercise(id: number, body: ExerciseWrite): Observable<Exercise> {
    return this.http.put<Exercise>(`${this.base}/exercises/${id}`, body).pipe(catchError(readError));
  }

  deleteExercise(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/exercises/${id}`).pipe(catchError(readError));
  }

  listSessions(): Observable<GymSession[]> {
    return this.http.get<GymSession[]>(`${this.base}/sessions`).pipe(catchError(readError));
  }

  activeSession(): Observable<GymSession | null> {
    return this.http.get<GymSession | null>(`${this.base}/sessions/active`).pipe(catchError(readError));
  }

  getSession(id: number): Observable<GymSession> {
    return this.http.get<GymSession>(`${this.base}/sessions/${id}`).pipe(catchError(readError));
  }

  startSession(performedOn?: string): Observable<GymSession> {
    return this.http
      .post<GymSession>(`${this.base}/sessions/start`, { performedOn: performedOn ?? undefined })
      .pipe(catchError(readError));
  }

  startFromTemplate(templateId: number, performedOn?: string): Observable<GymSession> {
    return this.http
      .post<GymSession>(`${this.base}/sessions/start-from-template/${templateId}`, {
        performedOn: performedOn ?? undefined,
      })
      .pipe(catchError(readError));
  }

  saveSession(id: number, body: SessionWrite): Observable<GymSession> {
    return this.http.put<GymSession>(`${this.base}/sessions/${id}`, body).pipe(catchError(readError));
  }

  finishSession(id: number, body: SessionWrite): Observable<FinishResponse> {
    return this.http.post<FinishResponse>(`${this.base}/sessions/${id}/finish`, body).pipe(catchError(readError));
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${id}`).pipe(catchError(readError));
  }

  exerciseStats(id: number): Observable<ExerciseStats> {
    return this.http.get<ExerciseStats>(`${this.base}/stats/exercises/${id}`).pipe(catchError(readError));
  }

  overview(range: string): Observable<ProgressOverview> {
    return this.http
      .get<ProgressOverview>(`${this.base}/stats/overview`, { params: new HttpParams().set('range', range) })
      .pipe(catchError(readError));
  }

  listTemplates(): Observable<WorkoutTemplate[]> {
    return this.http.get<WorkoutTemplate[]>(`${this.base}/templates`).pipe(catchError(readError));
  }

  createTemplate(body: TemplateWrite): Observable<WorkoutTemplate> {
    return this.http.post<WorkoutTemplate>(`${this.base}/templates`, body).pipe(catchError(readError));
  }

  updateTemplate(id: number, body: TemplateWrite): Observable<WorkoutTemplate> {
    return this.http.put<WorkoutTemplate>(`${this.base}/templates/${id}`, body).pipe(catchError(readError));
  }

  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/templates/${id}`).pipe(catchError(readError));
  }

  downloadJson(): Observable<Blob> {
    return this.http.get(`${this.base}/data/export.json`, { responseType: 'blob' }).pipe(catchError(readError));
  }

  downloadCsv(): Observable<Blob> {
    return this.http.get(`${this.base}/data/export.csv`, { responseType: 'blob' }).pipe(catchError(readError));
  }

  importJson(body: unknown): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.base}/data/import.json`, body).pipe(catchError(readError));
  }

  restore(body: unknown): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.base}/data/restore`, body).pipe(catchError(readError));
  }

  importCsv(csv: string): Observable<ImportResult> {
    return this.http
      .post<ImportResult>(`${this.base}/data/import.csv`, csv, {
        headers: { 'Content-Type': 'text/csv' },
      })
      .pipe(catchError(readError));
  }

  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(`${this.base}/settings`).pipe(catchError(readError));
  }

  updateSettings(body: AppSettings): Observable<AppSettings> {
    return this.http.put<AppSettings>(`${this.base}/settings`, body).pipe(catchError(readError));
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function readError(error: HttpErrorResponse) {
  const body = error.error as { error?: string; message?: string } | null;
  const message = body?.message ?? 'Could not reach the server. Is the API running?';
  const code = body?.error ?? 'SERVER_ERROR';
  return throwError(() => new ApiError(message, code, error.status));
}
