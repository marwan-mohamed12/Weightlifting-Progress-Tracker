import { Exercise } from './models';
import { estimatedOneRepMax, exerciseStats, Visit } from './local-stats';

const bench: Exercise = {
  id: 1,
  name: 'Bench press',
  notes: null,
  muscleGroup: 'CHEST',
  favorite: false,
  createdAt: '2026-09-19T00:00:00.000Z',
  updatedAt: '2026-09-19T00:00:00.000Z',
};

function visit(date: string, ...sets: { weightKg: number; reps: number }[]): Visit {
  return {
    date,
    sets: sets.map((set, index) => ({ ...set, setIndex: index + 1 })),
  };
}

describe('local stats', () => {
  it('matches the bench press 40 kg × 8/7/6 example', () => {
    const stats = exerciseStats(bench, [visit('2026-09-19', { weightKg: 40, reps: 8 }, { weightKg: 40, reps: 7 }, { weightKg: 40, reps: 6 })]);
    expect(stats.highestWeightKg).toBe(40);
    expect(stats.currentWeightKg).toBe(40);
    expect(stats.highestReps).toBe(8);
    expect(stats.totalSets).toBe(3);
    expect(stats.totalReps).toBe(21);
    expect(stats.sessionCount).toBe(1);
    expect(stats.lifetimeVolume).toBe(840);
    expect(stats.bestPerformance?.weightKg).toBe(40);
    expect(stats.bestPerformance?.reps).toBe(8);
    expect(stats.trend.direction).toBe('insufficient');
    expect(stats.weightFrequency).toHaveLength(1);
    expect(stats.weightFrequency[0].setCount).toBe(3);
    expect(stats.weightFrequency[0].totalReps).toBe(21);
    expect(stats.weightFrequency[0].sessionCount).toBe(1);
    expect(stats.personalRecords.estimatedOneRepMax).toBe(estimatedOneRepMax(40, 8));
  });

  it('marks trend up when recent max climbs by at least 2.5 kg', () => {
    const squat: Exercise = { ...bench, id: 2, name: 'Squat', muscleGroup: 'LEGS' };
    const stats = exerciseStats(squat, [
      visit('2026-02-01', { weightKg: 50, reps: 5 }),
      visit('2026-01-01', { weightKg: 40, reps: 5 }),
    ]);
    expect(stats.trend.direction).toBe('up');
    expect(stats.highestWeightKg).toBe(50);
  });

  it('marks trend stable inside the 2.5 kg threshold', () => {
    const row: Exercise = { ...bench, id: 3, name: 'Barbell row', muscleGroup: 'BACK' };
    const stats = exerciseStats(row, [
      visit('2026-01-08', { weightKg: 42, reps: 8 }),
      visit('2026-01-01', { weightKg: 40, reps: 8 }),
    ]);
    expect(stats.trend.direction).toBe('stable');
  });

  it('prefers heavier set, then more reps, then newer date for best performance', () => {
    const press: Exercise = { ...bench, id: 4, name: 'Overhead press', muscleGroup: 'SHOULDERS' };
    const stats = exerciseStats(press, [
      visit('2026-03-08', { weightKg: 40, reps: 8 }, { weightKg: 42.5, reps: 3 }),
      visit('2026-03-01', { weightKg: 40, reps: 6 }, { weightKg: 40, reps: 8 }),
    ]);
    expect(stats.bestPerformance?.weightKg).toBe(42.5);
    expect(stats.bestPerformance?.reps).toBe(3);
    expect(stats.bestPerformance?.date).toBe('2026-03-08');
    expect(stats.highestReps).toBe(8);
  });
});
