import { setLocale } from './i18n';
import { LocalDb } from './local-db';

describe('LocalDb', () => {
  let db: LocalDb;
  const key = 'plate.test.local-db';

  beforeEach(() => {
    setLocale('en');
    localStorage.removeItem(key);
    db = new LocalDb(key);
  });

  afterEach(() => {
    localStorage.removeItem(key);
  });

  it('seeds starter exercises and stores a finished session', () => {
    const exercises = db.listExercises();
    expect(exercises.length).toBeGreaterThan(0);
    const bench = exercises.find((row) => row.name === 'Bench press');
    expect(bench).toBeTruthy();

    const started = db.startSession('2026-09-19');
    expect(started.status).toBe('IN_PROGRESS');
    expect(db.activeSession()?.id).toBe(started.id);

    const finished = db.finishSession(started.id, {
      performedOn: '2026-09-19',
      notes: 'paused the last rep',
      lifts: [
        {
          exerciseId: bench!.id,
          sets: [
            { weightKg: 40, reps: 8 },
            { weightKg: 40, reps: 7 },
            { weightKg: 40, reps: 6 },
          ],
        },
      ],
    });

    expect(finished.session.status).toBe('COMPLETED');
    expect(finished.session.lifts[0].summary).toBe('40 kg · 8, 7, 6');
    expect(db.activeSession()).toBeNull();

    const stats = db.exerciseStats(bench!.id);
    expect(stats.highestWeightKg).toBe(40);
    expect(stats.totalReps).toBe(21);
    expect(stats.totalSets).toBe(3);
    expect(stats.sessionCount).toBe(1);
    expect(stats.lifetimeVolume).toBe(840);

    const overview = db.overview('all');
    expect(overview.currentVolume).toBe(840);
    expect(overview.exerciseFrequency[0].name).toBe('Bench press');

    const csv = db.exportCsv();
    expect(csv).toContain('Bench press');
    expect(csv).toContain('40');

    const json = db.exportJson();
    expect(json.sessions).toHaveLength(1);
    expect(json.exercises?.some((row) => row.name === 'Bench press')).toBe(true);
  });

  it('rejects a second in-progress session', () => {
    db.startSession('2026-09-19');
    expect(() => db.startSession('2026-09-20')).toThrow(/already in progress/);
  });

  it('blocks deleting an exercise that has sessions', () => {
    const bench = db.listExercises().find((row) => row.name === 'Bench press')!;
    const started = db.startSession('2026-09-19');
    db.finishSession(started.id, {
      performedOn: '2026-09-19',
      lifts: [{ exerciseId: bench.id, sets: [{ weightKg: 40, reps: 8 }] }],
    });
    expect(() => db.deleteExercise(bench.id)).toThrow(/has workouts/);
  });
});
