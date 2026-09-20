import { ApiError } from './api-error';
import {
  AppSettings,
  Exercise,
  ExerciseWrite,
  FinishResponse,
  GymSession,
  ImportResult,
  MuscleGroup,
  SessionLift,
  SessionWrite,
  TemplateWrite,
  WorkoutSet,
  WorkoutTemplate,
} from './models';
import {
  detectPersonalRecords,
  exerciseStats as buildExerciseStats,
  visitVolume as volumeOfSets,
  overview as buildOverview,
  summarizeSets,
  visitsFromSessions,
} from './local-stats';
import { todayIso } from './format';
import { t } from './i18n';

const STORAGE_KEY = 'plate.local.v1';

const MUSCLES: MuscleGroup[] = ['CHEST', 'BACK', 'SHOULDERS', 'LEGS', 'ARMS', 'CORE', 'OTHER'];

const STARTER: { name: string; muscleGroup: MuscleGroup }[] = [
  { name: 'Barbell row', muscleGroup: 'BACK' },
  { name: 'Bench press', muscleGroup: 'CHEST' },
  { name: 'Bicep curl', muscleGroup: 'ARMS' },
  { name: 'Deadlift', muscleGroup: 'BACK' },
  { name: 'Lat pulldown', muscleGroup: 'BACK' },
  { name: 'Lateral raise', muscleGroup: 'SHOULDERS' },
  { name: 'Leg press', muscleGroup: 'LEGS' },
  { name: 'Overhead press', muscleGroup: 'SHOULDERS' },
  { name: 'Plank', muscleGroup: 'CORE' },
  { name: 'Pull-up', muscleGroup: 'BACK' },
  { name: 'Romanian deadlift', muscleGroup: 'LEGS' },
  { name: 'Squat', muscleGroup: 'LEGS' },
  { name: 'Tricep pushdown', muscleGroup: 'ARMS' },
];

interface Snapshot {
  version: 1;
  next: {
    exercise: number;
    session: number;
    lift: number;
    set: number;
    template: number;
    templateExercise: number;
  };
  exercises: Exercise[];
  sessions: GymSession[];
  templates: WorkoutTemplate[];
  settings: AppSettings;
}

interface BackupPayload {
  version: number;
  exportedAt?: string;
  exercises?: Exercise[];
  sessions?: GymSession[];
  templates?: WorkoutTemplate[];
  settings?: AppSettings | null;
}

export class LocalDb {
  private data: Snapshot;

  constructor(private readonly key = STORAGE_KEY) {
    this.data = this.load();
  }

  listExercises(): Exercise[] {
    return this.data.exercises
      .slice()
      .sort((a, b) => {
        const fav = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
        if (fav !== 0) {
          return fav;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      })
      .map((row) => clone(withFavorite(row)));
  }

  getExercise(id: number): Exercise {
    return clone(this.requireExercise(id));
  }

  createExercise(body: ExerciseWrite): Exercise {
    const name = normalizeName(body.name);
    if (!name) {
      fail('VALIDATION', 'error.nameRequired', 400);
    }
    if (name.length > 120) {
      fail('VALIDATION', 'error.nameTooLong', 400);
    }
    if (this.data.exercises.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      fail('CONFLICT', 'error.exerciseExists', 409, { name });
    }
    const now = nowIso();
    const exercise: Exercise = {
      id: this.data.next.exercise++,
      name,
      notes: normalizeNotes(body.notes, 1000),
      muscleGroup: normalizeMuscle(body.muscleGroup),
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    this.data.exercises.push(exercise);
    this.save();
    return clone(exercise);
  }

  updateExercise(id: number, body: ExerciseWrite): Exercise {
    const exercise = this.requireExercise(id);
    const name = normalizeName(body.name);
    if (!name) {
      fail('VALIDATION', 'error.nameRequired', 400);
    }
    if (this.data.exercises.some((row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase())) {
      fail('CONFLICT', 'error.exerciseExists', 409, { name });
    }
    exercise.name = name;
    exercise.notes = normalizeNotes(body.notes, 1000);
    exercise.muscleGroup = normalizeMuscle(body.muscleGroup);
    exercise.updatedAt = nowIso();
    this.save();
    return clone(exercise);
  }

  deleteExercise(id: number): void {
    const exercise = this.requireExercise(id);
    const used =
      this.data.sessions.some((session) => session.lifts.some((lift) => lift.exerciseId === id)) ||
      this.data.templates.some((template) => template.exercises.some((item) => item.exerciseId === id));
    if (used) {
      fail('CONFLICT', 'error.exerciseInUse', 409, { name: exercise.name });
    }
    this.data.exercises = this.data.exercises.filter((row) => row.id !== id);
    this.save();
  }

  toggleFavorite(id: number): Exercise {
    const exercise = this.requireExercise(id);
    exercise.favorite = !Boolean(exercise.favorite);
    exercise.updatedAt = nowIso();
    this.save();
    return clone(withFavorite(exercise));
  }

  lastSetForExercise(exerciseId: number): { weightKg: number; reps: number } | null {
    const sessions = this.data.sessions
      .filter((session) => session.status === 'COMPLETED')
      .sort((a, b) => {
        if (a.performedOn !== b.performedOn) {
          return a.performedOn > b.performedOn ? -1 : 1;
        }
        return b.id - a.id;
      });
    for (const session of sessions) {
      const lift = session.lifts.find((item) => item.exerciseId === exerciseId);
      const last = lift?.sets[lift.sets.length - 1];
      if (last) {
        return { weightKg: last.weightKg, reps: last.reps };
      }
    }
    return null;
  }

  lastBodyWeight(): number | null {
    const sessions = this.data.sessions
      .filter((session) => session.bodyWeightKg && session.bodyWeightKg > 0)
      .sort((a, b) => {
        if (a.performedOn !== b.performedOn) {
          return a.performedOn > b.performedOn ? -1 : 1;
        }
        return b.id - a.id;
      });
    return sessions[0]?.bodyWeightKg ?? this.data.settings.lastBodyWeightKg ?? null;
  }

  listSessions(): GymSession[] {
    return this.data.sessions
      .slice()
      .sort((a, b) => {
        if (a.performedOn !== b.performedOn) {
          return a.performedOn > b.performedOn ? -1 : 1;
        }
        return b.id - a.id;
      })
      .map((session) => this.hydrateSession(session));
  }

  activeSession(): GymSession | null {
    const active = this.data.sessions
      .filter((session) => session.status === 'IN_PROGRESS')
      .sort((a, b) => b.id - a.id)[0];
    return active ? this.hydrateSession(active) : null;
  }

  getSession(id: number): GymSession {
    return this.hydrateSession(this.requireSession(id));
  }

  startSession(performedOn?: string): GymSession {
    this.assertNoActive();
    const now = nowIso();
    const session: GymSession = {
      id: this.data.next.session++,
      performedOn: performedOn || todayIso(),
      status: 'IN_PROGRESS',
      notes: null,
      bodyWeightKg: this.lastBodyWeight(),
      summary: '0 exercises · 0 sets',
      exerciseCount: 0,
      setCount: 0,
      lifts: [],
      createdAt: now,
      updatedAt: now,
      finishedAt: null,
    };
    this.data.sessions.push(session);
    this.save();
    return this.hydrateSession(session);
  }

  startFromTemplate(templateId: number, performedOn?: string): GymSession {
    this.assertNoActive();
    const template = this.requireTemplate(templateId);
    const now = nowIso();
    const lifts: SessionLift[] = template.exercises.map((item) => {
      const exercise = this.requireExercise(item.exerciseId);
      const sets: WorkoutSet[] = [];
      for (let i = 0; i < item.targetSets; i += 1) {
        sets.push({
          id: this.data.next.set++,
          setIndex: i + 1,
          weightKg: item.targetWeightKg,
          reps: item.targetReps,
        });
      }
      return {
        id: this.data.next.lift++,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        notes: null,
        summary: summarizeSets(sets),
        volume: volumeOfSets(sets),
        sets,
      };
    });
    const session: GymSession = {
      id: this.data.next.session++,
      performedOn: performedOn || todayIso(),
      status: 'IN_PROGRESS',
      notes: template.notes,
      bodyWeightKg: this.lastBodyWeight(),
      summary: '',
      exerciseCount: lifts.length,
      setCount: lifts.reduce((sum, lift) => sum + lift.sets.length, 0),
      lifts,
      createdAt: now,
      updatedAt: now,
      finishedAt: null,
    };
    this.data.sessions.push(session);
    this.save();
    return this.hydrateSession(session);
  }

  saveSession(id: number, body: SessionWrite): GymSession {
    const session = this.requireSession(id);
    this.apply(session, body);
    this.save();
    return this.hydrateSession(session);
  }

  finishSession(id: number, body: SessionWrite): FinishResponse {
    const session = this.requireSession(id);
    this.apply(session, body);
    if (!session.lifts.length) {
      fail('VALIDATION', 'error.finishEmpty', 400);
    }
    const hits = [];
    for (const lift of session.lifts) {
      const previous = visitsFromSessions(
        this.data.sessions.filter((row) => row.id !== session.id),
        lift.exerciseId,
      );
      hits.push(
        ...detectPersonalRecords(
          { id: lift.exerciseId, name: lift.exerciseName },
          previous,
          {
            date: session.performedOn,
            sets: lift.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps, setIndex: set.setIndex })),
          },
        ),
      );
    }
    session.status = 'COMPLETED';
    session.finishedAt = nowIso();
    session.updatedAt = nowIso();
    this.save();
    return { session: this.hydrateSession(session), personalRecords: hits };
  }

  deleteSession(id: number): void {
    this.requireSession(id);
    this.data.sessions = this.data.sessions.filter((row) => row.id !== id);
    this.save();
  }

  exerciseStats(id: number) {
    const exercise = this.requireExercise(id);
    const stats = buildExerciseStats(exercise, visitsFromSessions(this.data.sessions, id));
    return { ...stats, ...this.bodyWeightForExercise(id) };
  }

  overview(range: string) {
    const completed = this.data.sessions
      .filter((session) => session.status === 'COMPLETED')
      .sort((a, b) => {
        if (a.performedOn !== b.performedOn) {
          return a.performedOn < b.performedOn ? -1 : 1;
        }
        return a.id - b.id;
      })
      .map((session) => this.hydrateSession(session));
    return buildOverview(completed, this.data.exercises, range || 'all', todayIso());
  }

  listTemplates(): WorkoutTemplate[] {
    return this.data.templates
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((template) => this.hydrateTemplate(template));
  }

  createTemplate(body: TemplateWrite): WorkoutTemplate {
    const template: WorkoutTemplate = {
      id: this.data.next.template++,
      name: requireName(body.name),
      notes: normalizeNotes(body.notes, 2000),
      exercises: this.toTemplateItems(body.exercises),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.data.templates.push(template);
    this.save();
    return this.hydrateTemplate(template);
  }

  updateTemplate(id: number, body: TemplateWrite): WorkoutTemplate {
    const template = this.requireTemplate(id);
    template.name = requireName(body.name);
    template.notes = normalizeNotes(body.notes, 2000);
    template.exercises = this.toTemplateItems(body.exercises);
    template.updatedAt = nowIso();
    this.save();
    return this.hydrateTemplate(template);
  }

  deleteTemplate(id: number): void {
    this.requireTemplate(id);
    this.data.templates = this.data.templates.filter((row) => row.id !== id);
    this.save();
  }

  exportJson(): BackupPayload {
    return {
      version: 1,
      exportedAt: nowIso(),
      exercises: this.listExercises(),
      sessions: this.listSessions(),
      templates: this.listTemplates(),
      settings: clone(this.data.settings),
    };
  }

  exportCsv(): string {
    let csv = 'date,sessionId,status,exercise,muscleGroup,setIndex,weightKg,reps,volume\n';
    for (const session of this.listSessions()) {
      for (const lift of session.lifts) {
        const exercise = this.data.exercises.find((row) => row.id === lift.exerciseId);
        const muscle = exercise?.muscleGroup ?? 'OTHER';
        for (const set of lift.sets) {
          const volume = set.weightKg * set.reps;
          csv +=
            `${session.performedOn},${session.id},${session.status},` +
            `${csvEscape(lift.exerciseName)},${muscle},${set.setIndex},` +
            `${toCsvNumber(set.weightKg)},${set.reps},${toCsvNumber(volume)}\n`;
        }
      }
    }
    return csv;
  }

  importJson(body: unknown): ImportResult {
    const payload = asBackup(body);
    this.assertVersion(payload);
    return this.importPayload(payload);
  }

  restore(body: unknown): ImportResult {
    const payload = asBackup(body);
    this.assertVersion(payload);
    this.data.sessions = [];
    this.data.templates = [];
    this.save();
    return this.importPayload(payload);
  }

  importCsv(csv: string): ImportResult {
    if (!csv || !csv.trim()) {
      fail('VALIDATION', 'error.csvEmpty', 400);
    }
    const lines = csv.replace(/\r\n/g, '\n').split('\n');
    if (lines.length < 2) {
      fail('VALIDATION', 'error.csvHeader', 400);
    }
    const bySession = new Map<string, CsvRow[]>();
    const warnings: string[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) {
        continue;
      }
      const cols = line.split(',');
      if (cols.length < 8) {
        warnings.push(`ERROR row ${i + 1}: expected at least 8 columns.`);
        continue;
      }
      try {
        const date = cols[0].trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw new Error('invalid date');
        }
        const row: CsvRow = {
          date,
          exerciseName: cols[3].replaceAll('"', '').trim(),
          muscleGroup: cols.length > 4 ? cols[4].trim() : 'OTHER',
          setIndex: Number(cols[5].trim()),
          weightKg: Number(cols[6].trim()),
          reps: Number(cols[7].trim()),
        };
        if (!(row.weightKg > 0) || row.reps < 1) {
          warnings.push(`ERROR row ${i + 1}: weight and reps must be positive.`);
          continue;
        }
        const key = `${row.date}|${cols[1].trim()}`;
        const bucket = bySession.get(key) ?? [];
        bucket.push(row);
        bySession.set(key, bucket);
      } catch (ex) {
        warnings.push(`ERROR row ${i + 1}: ${ex instanceof Error ? ex.message : 'invalid row'}`);
      }
    }
    if (warnings.some((warning) => warning.startsWith('ERROR'))) {
      fail('VALIDATION', warnings.join('; '), 400);
    }
    let sessionCount = 0;
    const now = nowIso();
    for (const rows of bySession.values()) {
      const byExercise = new Map<string, CsvRow[]>();
      for (const row of rows) {
        const bucket = byExercise.get(row.exerciseName) ?? [];
        bucket.push(row);
        byExercise.set(row.exerciseName, bucket);
      }
      const lifts: SessionLift[] = [];
      for (const [exerciseName, items] of byExercise) {
        const first = items[0];
        const exercise = this.upsertExercise(exerciseName, first.muscleGroup);
        const sets = items
          .slice()
          .sort((a, b) => a.setIndex - b.setIndex)
          .map((row, index) => ({
            id: this.data.next.set++,
            setIndex: index + 1,
            weightKg: row.weightKg,
            reps: row.reps,
          }));
        lifts.push({
          id: this.data.next.lift++,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          notes: null,
          summary: summarizeSets(sets),
          volume: volumeOfSets(sets),
          sets,
        });
      }
      this.data.sessions.push({
        id: this.data.next.session++,
        performedOn: rows[0].date,
        status: 'COMPLETED',
        notes: null,
        bodyWeightKg: null,
        summary: '',
        exerciseCount: lifts.length,
        setCount: lifts.reduce((sum, lift) => sum + lift.sets.length, 0),
        lifts,
        createdAt: now,
        updatedAt: now,
        finishedAt: now,
      });
      sessionCount += 1;
    }
    this.save();
    return { exercises: this.data.exercises.length, sessions: sessionCount, templates: 0, warnings };
  }

  getSettings(): AppSettings {
    return clone(this.data.settings);
  }

  updateSettings(body: AppSettings): AppSettings {
    this.data.settings = normalizeSettings({
      ...this.data.settings,
      ...body,
    });
    this.save();
    return clone(this.data.settings);
  }

  private importPayload(payload: BackupPayload): ImportResult {
    const warnings: string[] = [];
    const byOldId = new Map<number, Exercise>();
    let exerciseCount = 0;
    for (const row of payload.exercises ?? []) {
      if (!row?.name?.trim()) {
        warnings.push('Skipped an exercise with no name.');
        continue;
      }
      const exercise = this.upsertExercise(row.name, row.muscleGroup);
      if (row.id != null) {
        byOldId.set(row.id, exercise);
      }
      exerciseCount += 1;
    }
    let sessionCount = 0;
    for (const row of payload.sessions ?? []) {
      if (!row?.performedOn || !row.lifts?.length) {
        warnings.push('Skipped a session with no date or lifts.');
        continue;
      }
      const lifts: SessionLift[] = [];
      for (const liftRow of row.lifts) {
        let exercise = liftRow.exerciseId != null ? byOldId.get(liftRow.exerciseId) : undefined;
        if (!exercise) {
          exercise = this.upsertExercise(liftRow.exerciseName || 'Exercise', 'OTHER');
        }
        if (!liftRow.sets?.length) {
          warnings.push(`Skipped a lift with no sets on ${row.performedOn}.`);
          continue;
        }
        const sets = liftRow.sets.map((set, index) => ({
          id: this.data.next.set++,
          setIndex: index + 1,
          weightKg: Number(set.weightKg),
          reps: Number(set.reps),
        }));
        lifts.push({
          id: this.data.next.lift++,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          notes: liftRow.notes ?? null,
          summary: summarizeSets(sets),
          volume: volumeOfSets(sets),
          sets,
        });
      }
      if (!lifts.length) {
        continue;
      }
      const now = nowIso();
      this.data.sessions.push({
        id: this.data.next.session++,
        performedOn: row.performedOn,
        status: row.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'COMPLETED',
        notes: row.notes ?? null,
        bodyWeightKg: row.bodyWeightKg ?? null,
        summary: '',
        exerciseCount: lifts.length,
        setCount: lifts.reduce((sum, lift) => sum + lift.sets.length, 0),
        lifts,
        createdAt: row.createdAt || now,
        updatedAt: row.updatedAt || now,
        finishedAt: row.status === 'IN_PROGRESS' ? null : row.finishedAt || now,
      });
      sessionCount += 1;
    }
    let templateCount = 0;
    for (const row of payload.templates ?? []) {
      if (!row?.name || !row.exercises?.length) {
        warnings.push('Skipped a template with no exercises.');
        continue;
      }
      const items = row.exercises.map((item) => {
        let exercise = item.exerciseId != null ? byOldId.get(item.exerciseId) : undefined;
        if (!exercise) {
          exercise = this.upsertExercise(item.exerciseName || 'Exercise', 'OTHER');
        }
        return {
          id: this.data.next.templateExercise++,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          targetSets: item.targetSets,
          targetReps: item.targetReps,
          targetWeightKg: item.targetWeightKg,
        };
      });
      const now = nowIso();
      this.data.templates.push({
        id: this.data.next.template++,
        name: row.name,
        notes: row.notes ?? null,
        exercises: items,
        createdAt: row.createdAt || now,
        updatedAt: row.updatedAt || now,
      });
      templateCount += 1;
    }
    if (payload.settings) {
      this.data.settings = normalizeSettings(payload.settings);
    }
    this.save();
    return { exercises: exerciseCount, sessions: sessionCount, templates: templateCount, warnings };
  }

  private apply(session: GymSession, body: SessionWrite): void {
    session.performedOn = body.performedOn;
    session.notes = normalizeNotes(body.notes, 2000);
    session.bodyWeightKg = parseBodyWeight(body.bodyWeightKg);
    if (session.bodyWeightKg) {
      this.data.settings.lastBodyWeightKg = session.bodyWeightKg;
    }
    const liftRequests = body.lifts ?? [];
    const lifts: SessionLift[] = [];
    for (const liftRequest of liftRequests) {
      const exercise = this.requireExercise(liftRequest.exerciseId);
      const sets: WorkoutSet[] = (liftRequest.sets ?? []).map((set, index) => {
        const weightKg = Number(set.weightKg);
        const reps = Number(set.reps);
        if (!(weightKg > 0) || weightKg > 1000) {
          fail('VALIDATION', 'error.weightRange', 400);
        }
        if (!Number.isInteger(reps) || reps < 1 || reps > 500) {
          fail('VALIDATION', 'error.repsRange', 400);
        }
        return {
          id: this.data.next.set++,
          setIndex: index + 1,
          weightKg,
          reps,
        };
      });
      lifts.push({
        id: this.data.next.lift++,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        notes: normalizeNotes(liftRequest.notes, 2000),
        summary: summarizeSets(sets),
        volume: volumeOfSets(sets),
        sets,
      });
    }
    session.lifts = lifts;
    session.updatedAt = nowIso();
  }

  private toTemplateItems(requests: TemplateWrite['exercises']): WorkoutTemplate['exercises'] {
    if (!requests?.length) {
      fail('VALIDATION', 'error.templateEmpty', 400);
    }
    return requests.map((request) => {
      const exercise = this.requireExercise(request.exerciseId);
      if (!Number.isInteger(request.targetSets) || request.targetSets < 1 || request.targetSets > 50) {
        fail('VALIDATION', 'error.targetSets', 400);
      }
      if (!Number.isInteger(request.targetReps) || request.targetReps < 1 || request.targetReps > 500) {
        fail('VALIDATION', 'error.targetReps', 400);
      }
      if (!(request.targetWeightKg > 0)) {
        fail('VALIDATION', 'error.targetWeight', 400);
      }
      return {
        id: this.data.next.templateExercise++,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        targetSets: request.targetSets,
        targetReps: request.targetReps,
        targetWeightKg: request.targetWeightKg,
      };
    });
  }

  private upsertExercise(name: string, muscleGroup: string | undefined): Exercise {
    const trimmed = name.trim();
    const existing = this.data.exercises.find((row) => row.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      return existing;
    }
    const now = nowIso();
    const exercise: Exercise = {
      id: this.data.next.exercise++,
      name: trimmed,
      notes: null,
      muscleGroup: normalizeMuscle(muscleGroup),
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    this.data.exercises.push(exercise);
    return exercise;
  }

  private hydrateSession(session: GymSession): GymSession {
    const lifts = session.lifts.map((lift) => {
      const exercise = this.data.exercises.find((row) => row.id === lift.exerciseId);
      const sets = lift.sets.map((set) => ({ ...set }));
      return {
        ...lift,
        exerciseName: exercise?.name ?? lift.exerciseName,
        summary: summarizeSets(sets),
        volume: volumeOfSets(sets),
        sets,
      };
    });
    const setCount = lifts.reduce((sum, lift) => sum + lift.sets.length, 0);
    return {
      ...session,
      bodyWeightKg: session.bodyWeightKg ?? null,
      lifts,
      exerciseCount: lifts.length,
      setCount,
      summary: t('session.summary', { exercises: lifts.length, sets: setCount }),
    };
  }

  private bodyWeightForExercise(exerciseId: number): { lastBodyWeightKg: number | null; bestPerBodyWeight: number | null } {
    let lastBodyWeightKg: number | null = null;
    let bestPerBodyWeight: number | null = null;
    const sessions = this.data.sessions
      .filter((session) => session.status === 'COMPLETED')
      .sort((a, b) => (a.performedOn === b.performedOn ? b.id - a.id : a.performedOn > b.performedOn ? -1 : 1));
    for (const session of sessions) {
      const lift = session.lifts.find((item) => item.exerciseId === exerciseId);
      if (!lift?.sets.length) {
        continue;
      }
      const bw = session.bodyWeightKg;
      if (bw && bw > 0) {
        if (lastBodyWeightKg == null) {
          lastBodyWeightKg = bw;
        }
        const max = Math.max(...lift.sets.map((set) => set.weightKg));
        const ratio = max / bw;
        if (bestPerBodyWeight == null || ratio > bestPerBodyWeight) {
          bestPerBodyWeight = Math.round(ratio * 100) / 100;
        }
      }
    }
    return { lastBodyWeightKg, bestPerBodyWeight };
  }

  private hydrateTemplate(template: WorkoutTemplate): WorkoutTemplate {
    return {
      ...template,
      exercises: template.exercises.map((item) => {
        const exercise = this.data.exercises.find((row) => row.id === item.exerciseId);
        return { ...item, exerciseName: exercise?.name ?? item.exerciseName };
      }),
    };
  }

  private requireExercise(id: number): Exercise {
    const exercise = this.data.exercises.find((row) => row.id === id);
    if (!exercise) {
      fail('NOT_FOUND', 'error.exerciseNotFound', 404, { id });
    }
    return exercise;
  }

  private requireSession(id: number): GymSession {
    const session = this.data.sessions.find((row) => row.id === id);
    if (!session) {
      fail('NOT_FOUND', 'error.sessionNotFound', 404, { id });
    }
    return session;
  }

  private requireTemplate(id: number): WorkoutTemplate {
    const template = this.data.templates.find((row) => row.id === id);
    if (!template) {
      fail('NOT_FOUND', 'error.templateNotFound', 404, { id });
    }
    return template;
  }

  private assertNoActive(): void {
    if (this.data.sessions.some((session) => session.status === 'IN_PROGRESS')) {
      fail('CONFLICT', 'error.activeExists', 409);
    }
  }

  private assertVersion(payload: BackupPayload): void {
    if (payload.version > 1) {
      fail('VALIDATION', 'error.backupVersion', 400, { version: payload.version });
    }
  }

  private load(): Snapshot {
    if (typeof localStorage === 'undefined') {
      return emptySnapshot();
    }
    const raw = localStorage.getItem(this.key);
    if (!raw) {
      const seeded = seedSnapshot();
      persist(this.key, seeded);
      return seeded;
    }
    try {
      const parsed = JSON.parse(raw) as Snapshot;
      if (!parsed || parsed.version !== 1 || !parsed.exercises || !parsed.sessions || !parsed.templates) {
        throw new Error('bad snapshot');
      }
      parsed.settings = normalizeSettings(parsed.settings);
      parsed.next ??= emptySnapshot().next;
      for (const exercise of parsed.exercises) {
        exercise.favorite = Boolean(exercise.favorite);
      }
      for (const session of parsed.sessions) {
        session.bodyWeightKg = session.bodyWeightKg ?? null;
      }
      return parsed;
    } catch {
      localStorage.setItem(`${this.key}.corrupt`, raw);
      const seeded = seedSnapshot();
      persist(this.key, seeded);
      return seeded;
    }
  }

  private save(): void {
    persist(this.key, this.data);
  }
}

export const localDb = new LocalDb();

function seedSnapshot(): Snapshot {
  const now = nowIso();
  const exercises: Exercise[] = STARTER.map((item, index) => ({
    id: index + 1,
    name: item.name,
    notes: null,
    muscleGroup: item.muscleGroup,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }));
  return {
    version: 1,
    next: {
      exercise: exercises.length + 1,
      session: 1,
      lift: 1,
      set: 1,
      template: 1,
      templateExercise: 1,
    },
    exercises,
    sessions: [],
    templates: [],
    settings: defaultSettings(),
  };
}

function emptySnapshot(): Snapshot {
  return {
    version: 1,
    next: { exercise: 1, session: 1, lift: 1, set: 1, template: 1, templateExercise: 1 },
    exercises: [],
    sessions: [],
    templates: [],
    settings: defaultSettings(),
  };
}

function defaultSettings(): AppSettings {
  return { notifyPersonalRecords: true, restTimerSeconds: 90, lastBodyWeightKg: null };
}

function normalizeSettings(settings?: Partial<AppSettings> | null): AppSettings {
  const rest = Number(settings?.restTimerSeconds);
  return {
    notifyPersonalRecords: settings?.notifyPersonalRecords !== false,
    restTimerSeconds: Number.isFinite(rest) && rest >= 0 ? rest : 90,
    lastBodyWeightKg: settings?.lastBodyWeightKg ?? null,
  };
}

function withFavorite(exercise: Exercise): Exercise {
  return { ...exercise, favorite: Boolean(exercise.favorite) };
}

function parseBodyWeight(value: number | null | undefined): number | null {
  if (value == null || value === ('' as unknown as number)) {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  if (n < 20 || n > 400) {
    fail('VALIDATION', 'error.bwRange', 400);
  }
  return Math.round(n * 10) / 10;
}

function persist(key: string, data: Snapshot): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(key, JSON.stringify(data));
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeName(name: string | undefined): string {
  return (name ?? '').trim().replace(/\s+/g, ' ');
}

function requireName(name: string | undefined): string {
  const value = normalizeName(name);
  if (!value) {
    fail('VALIDATION', 'error.nameRequired', 400);
  }
  if (value.length > 120) {
    fail('VALIDATION', 'error.nameTooLong', 400);
  }
  return value;
}

function normalizeNotes(notes: string | null | undefined, max: number): string | null {
  if (notes == null) {
    return null;
  }
  const trimmed = notes.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > max) {
    fail('VALIDATION', 'error.notesTooLong', 400, { max });
  }
  return trimmed;
}

function normalizeMuscle(muscleGroup: string | undefined | null): MuscleGroup {
  if (!muscleGroup || !muscleGroup.trim()) {
    return 'OTHER';
  }
  const value = muscleGroup.trim().toUpperCase().replaceAll(' ', '_') as MuscleGroup;
  return MUSCLES.includes(value) ? value : 'OTHER';
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toCsvNumber(value: number): string {
  return parseFloat(value.toFixed(2)).toString();
}

function asBackup(body: unknown): BackupPayload {
  if (!body || typeof body !== 'object') {
    fail('VALIDATION', 'error.backupEmpty', 400);
  }
  const payload = body as BackupPayload;
  if (typeof payload.version !== 'number') {
    fail('VALIDATION', 'error.backupVersionMissing', 400);
  }
  return payload;
}

function fail(code: string, key: string, status: number, params?: Record<string, string | number>): never {
  throw new ApiError(t(key, params), code, status);
}

interface CsvRow {
  date: string;
  exerciseName: string;
  muscleGroup: string;
  setIndex: number;
  weightKg: number;
  reps: number;
}
