import {
  BestPerformance,
  Exercise,
  ExerciseStats,
  GymSession,
  MuscleGroup,
  PersonalRecordHit,
  ProgressOverview,
  SessionSnapshot,
  WorkoutSet,
} from './models';

export type VisitSet = { weightKg: number; reps: number; setIndex: number };
export type Visit = { date: string; sets: VisitSet[] };

export const TREND_THRESHOLD_KG = 2.5;

export function roundHalfUp(value: number, scale: number): number {
  const factor = 10 ** scale;
  return Math.round(value * factor + Number.EPSILON) / factor;
}

export function toPlain(value: number): string {
  return String(parseFloat(roundHalfUp(value, 2).toFixed(2)));
}

export function estimatedOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) {
    return roundHalfUp(weight, 2);
  }
  const add = roundHalfUp(reps / 30, 6);
  return roundHalfUp(weight * (1 + add), 2);
}

export function visitVolume(sets: VisitSet[]): number {
  let sum = 0;
  for (const set of sets) {
    sum += set.weightKg * set.reps;
  }
  return roundHalfUp(sum, 2);
}

export function visitMaxWeight(sets: VisitSet[]): number {
  let max = 0;
  for (const set of sets) {
    if (set.weightKg > max) {
      max = set.weightKg;
    }
  }
  return max;
}

export function summarizeSets(sets: WorkoutSet[]): string {
  if (!sets.length) {
    return '';
  }
  const first = sets[0].weightKg;
  const same = sets.every((set) => set.weightKg === first);
  if (same) {
    return `${toPlain(first)} kg · ${sets.map((set) => String(set.reps)).join(', ')}`;
  }
  return sets.map((set) => `${toPlain(set.weightKg)}×${set.reps}`).join(', ');
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
  const clamped = Math.min(day, lastDay);
  return new Date(Date.UTC(nextYear, nextMonth, clamped)).toISOString().slice(0, 10);
}

export function daysInclusive(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

export function startFor(range: string | null | undefined, today: string): string | null {
  if (!range || range.toLowerCase() === 'all') {
    return null;
  }
  switch (range.toLowerCase()) {
    case '7d':
      return addDays(today, -6);
    case '30d':
      return addDays(today, -29);
    case '90d':
    case '3m':
      return addDays(today, -89);
    case '6m':
      return addMonths(today, -6);
    case '1y':
      return addMonths(today, -12);
    case '30m':
      return addMonths(today, -30);
    default:
      return addDays(today, -29);
  }
}

export function percentDelta(previous: number, current: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return roundHalfUp(((current - previous) * 100) / previous, 1);
}

export function detectPersonalRecords(
  exercise: { id: number; name: string },
  previous: Visit[],
  incoming: Visit,
): PersonalRecordHit[] {
  const hits: PersonalRecordHit[] = [];
  if (!incoming.sets.length) {
    return hits;
  }
  const before = snapshotFrom(previous);
  const now = snapshotFrom([incoming]);

  if (now.heaviest > before.heaviest) {
    hits.push(
      hit(
        exercise,
        'HEAVIEST_WEIGHT',
        'Heaviest weight',
        before.heaviest || null,
        now.heaviest,
        `${toPlain(now.heaviest)} kg`,
        incoming.date,
      ),
    );
  }
  if (now.mostReps > before.mostReps) {
    hits.push(
      hit(
        exercise,
        'MOST_REPS_SINGLE_SET',
        'Most reps in one set',
        before.mostReps === 0 ? null : before.mostReps,
        now.mostReps,
        `${now.mostReps} reps`,
        incoming.date,
      ),
    );
  }
  if (now.volume > before.volume) {
    hits.push(
      hit(
        exercise,
        'HIGHEST_VOLUME',
        'Highest total volume',
        before.volume || null,
        now.volume,
        `${toPlain(now.volume)} kg`,
        incoming.date,
      ),
    );
  }
  if (now.oneRepMax > before.oneRepMax) {
    hits.push(
      hit(
        exercise,
        'ESTIMATED_1RM',
        'Estimated 1 rep max',
        before.oneRepMax || null,
        now.oneRepMax,
        `${toPlain(now.oneRepMax)} kg`,
        incoming.date,
      ),
    );
  }
  for (const [weight, reps] of now.repsAtWeight) {
    const previousReps = before.repsAtWeight.get(weight) ?? 0;
    if (reps > previousReps) {
      hits.push(
        hit(
          exercise,
          'MOST_REPS_AT_WEIGHT',
          `Most reps at ${toPlain(weight)} kg`,
          previousReps === 0 ? null : previousReps,
          reps,
          `${reps} reps at ${toPlain(weight)} kg`,
          incoming.date,
        ),
      );
    }
  }
  return hits;
}

export function exerciseStats(exercise: Exercise, visitsNewestFirst: Visit[]): ExerciseStats {
  if (!visitsNewestFirst.length) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      currentWeightKg: null,
      highestWeightKg: null,
      highestReps: null,
      totalSets: 0,
      totalReps: 0,
      sessionCount: 0,
      lifetimeVolume: 0,
      bestPerformance: null,
      personalRecords: {
        heaviestWeightKg: null,
        mostRepsInOneSet: null,
        highestVolume: null,
        estimatedOneRepMax: null,
        mostRepsAtWeight: [],
      },
      trend: { direction: 'insufficient', sessions: [] },
      weightFrequency: [],
      lastBodyWeightKg: null,
      bestPerBodyWeight: null,
    };
  }

  let totalSets = 0;
  let totalReps = 0;
  let highestWeight = 0;
  let highestReps = 0;
  let highestVolume = 0;
  let estimated1Rm = 0;
  let best: BestPerformance | null = null;
  const byWeight = new Map<number, { setCount: number; totalReps: number; visits: Set<Visit> }>();
  const sessionsNewestFirst: SessionSnapshot[] = [];
  const mostRepsAtWeight = new Map<number, number>();
  const currentWeightKg = visitMaxWeight(visitsNewestFirst[0].sets);

  for (const visit of visitsNewestFirst) {
    const volume = visitVolume(visit.sets);
    totalSets += visit.sets.length;
    totalReps += visit.sets.reduce((sum, set) => sum + set.reps, 0);
    if (volume > highestVolume) {
      highestVolume = volume;
    }
    let setIndex = 0;
    for (const set of visit.sets) {
      setIndex += 1;
      if (set.weightKg > highestWeight) {
        highestWeight = set.weightKg;
      }
      if (set.reps > highestReps) {
        highestReps = set.reps;
      }
      const e1rm = estimatedOneRepMax(set.weightKg, set.reps);
      if (e1rm > estimated1Rm) {
        estimated1Rm = e1rm;
      }
      best = better(best, visit.date, set, setIndex);
      const key = normalized(set.weightKg);
      let bucket = byWeight.get(key);
      if (!bucket) {
        bucket = { setCount: 0, totalReps: 0, visits: new Set() };
        byWeight.set(key, bucket);
      }
      bucket.setCount += 1;
      bucket.totalReps += set.reps;
      bucket.visits.add(visit);
      const prevBest = mostRepsAtWeight.get(key) ?? 0;
      if (set.reps > prevBest) {
        mostRepsAtWeight.set(key, set.reps);
      }
    }
    sessionsNewestFirst.push({
      date: visit.date,
      maxWeightKg: visitMaxWeight(visit.sets),
      totalReps: visit.sets.reduce((sum, set) => sum + set.reps, 0),
      totalVolume: volume,
    });
  }

  const weightFrequency = [...byWeight.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([weightKg, bucket]) => ({
      weightKg,
      setCount: bucket.setCount,
      totalReps: bucket.totalReps,
      sessionCount: bucket.visits.size,
    }));

  const repsAtWeight = [...mostRepsAtWeight.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([weightKg, reps]) => ({ weightKg, reps }));

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    currentWeightKg,
    highestWeightKg: highestWeight,
    highestReps,
    totalSets,
    totalReps,
    sessionCount: visitsNewestFirst.length,
    lifetimeVolume: roundHalfUp(
      visitsNewestFirst.reduce((sum, visit) => sum + visitVolume(visit.sets), 0),
      2,
    ),
    bestPerformance: best,
    personalRecords: {
      heaviestWeightKg: highestWeight,
      mostRepsInOneSet: highestReps,
      highestVolume,
      estimatedOneRepMax: estimated1Rm,
      mostRepsAtWeight: repsAtWeight,
    },
    trend: { direction: trendDirection(sessionsNewestFirst), sessions: sessionsNewestFirst },
    weightFrequency,
    lastBodyWeightKg: null,
    bestPerBodyWeight: null,
  };
}

export function overview(
  completed: GymSession[],
  exercises: Exercise[],
  range: string,
  today: string,
): ProgressOverview {
  const from = startFor(range, today);
  const inRange = completed.filter((session) => {
    if (from && session.performedOn < from) {
      return false;
    }
    return session.performedOn <= today;
  });

  const currentVolume = sessionVolume(inRange);
  const earliest = inRange.reduce((min, session) => (session.performedOn < min ? session.performedOn : min), today);
  const days = from == null ? Math.max(1, daysInclusive(earliest, today)) : daysInclusive(from, today);
  const weeks = Math.max(days / 7, 1);
  const weeklyVolume = roundHalfUp(currentVolume / weeks, 2);
  const weeklyFrequency = roundHalfUp(inRange.length / weeks, 2);

  const monthStart = today.slice(0, 8) + '01';
  const monthlyVolume = sessionVolume(
    completed.filter((session) => session.performedOn >= monthStart && session.performedOn <= today),
  );

  const totals = setTotals(inRange);
  const averageWeight = totals.sets === 0 ? 0 : roundHalfUp(totals.weightSum / totals.sets, 2);
  const averageReps = totals.sets === 0 ? 0 : roundHalfUp(totals.repsSum / totals.sets, 2);

  const previousFrom = from == null ? null : addDays(from, -days);
  const previousTo = from == null ? null : addDays(from, -1);
  const previousVolume =
    previousFrom == null
      ? 0
      : sessionVolume(
          completed.filter((session) => session.performedOn >= previousFrom && session.performedOn <= previousTo!),
        );

  return {
    range: range || 'all',
    from,
    to: today,
    weeklyVolume,
    monthlyVolume,
    weeklyFrequency,
    averageWeight,
    averageReps,
    progressPercent: percentDelta(previousVolume, currentVolume),
    currentVolume,
    previousVolume,
    volumeByMuscle: volumeByMuscle(inRange, exercises),
    exerciseFrequency: exerciseFrequency(inRange),
    comparison: monthComparison(completed, today),
    prTimeline: prTimeline(completed, from, today),
  };
}

export function prTimeline(completed: GymSession[], from: string | null, to: string): PersonalRecordHit[] {
  const chronological = [...completed].sort((a, b) => {
    if (a.performedOn !== b.performedOn) {
      return a.performedOn < b.performedOn ? -1 : 1;
    }
    return a.id - b.id;
  });
  const history = new Map<number, Visit[]>();
  const timeline: PersonalRecordHit[] = [];
  for (const session of chronological) {
    for (const lift of session.lifts) {
      const previous = history.get(lift.exerciseId) ?? [];
      const incoming: Visit = {
        date: session.performedOn,
        sets: lift.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps, setIndex: set.setIndex })),
      };
      const hits = detectPersonalRecords(
        { id: lift.exerciseId, name: lift.exerciseName },
        previous,
        incoming,
      );
      history.set(lift.exerciseId, [...previous, incoming]);
      if (from != null && session.performedOn < from) {
        continue;
      }
      if (session.performedOn > to) {
        continue;
      }
      timeline.push(...hits);
    }
  }
  return timeline;
}

export function visitsFromSessions(sessions: GymSession[], exerciseId: number): Visit[] {
  const visits: Visit[] = [];
  const completed = sessions
    .filter((session) => session.status === 'COMPLETED')
    .sort((a, b) => {
      if (a.performedOn !== b.performedOn) {
        return a.performedOn > b.performedOn ? -1 : 1;
      }
      return b.id - a.id;
    });
  for (const session of completed) {
    for (const lift of session.lifts) {
      if (lift.exerciseId !== exerciseId) {
        continue;
      }
      visits.push({
        date: session.performedOn,
        sets: lift.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps, setIndex: set.setIndex })),
      });
    }
  }
  return visits;
}

function sessionVolume(sessions: GymSession[]): number {
  let sum = 0;
  for (const session of sessions) {
    for (const lift of session.lifts) {
      for (const set of lift.sets) {
        sum += set.weightKg * set.reps;
      }
    }
  }
  return roundHalfUp(sum, 2);
}

function volumeByMuscle(sessions: GymSession[], exercises: Exercise[]): { name: string; volume: number }[] {
  const groups = new Map<string, number>();
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  for (const session of sessions) {
    for (const lift of session.lifts) {
      const group: MuscleGroup = byId.get(lift.exerciseId)?.muscleGroup ?? 'OTHER';
      let liftVolume = 0;
      for (const set of lift.sets) {
        liftVolume += set.weightKg * set.reps;
      }
      groups.set(group, (groups.get(group) ?? 0) + liftVolume);
    }
  }
  return [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, volume]) => ({ name, volume: roundHalfUp(volume, 2) }));
}

function exerciseFrequency(sessions: GymSession[]): { exerciseId: number; name: string; sessions: number }[] {
  const map = new Map<number, { exerciseId: number; name: string; sessions: number }>();
  for (const session of sessions) {
    for (const lift of session.lifts) {
      const current = map.get(lift.exerciseId);
      if (!current) {
        map.set(lift.exerciseId, { exerciseId: lift.exerciseId, name: lift.exerciseName, sessions: 1 });
      } else {
        current.sessions += 1;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.sessions - a.sessions);
}

function monthComparison(completed: GymSession[], today: string) {
  const thisStart = `${today.slice(0, 8)}01`;
  const lastStart = addMonths(thisStart, -1);
  const lastEnd = addDays(thisStart, -1);
  const thisMonth = periodStats('This month', completed, thisStart, today);
  const lastMonth = periodStats('Last month', completed, lastStart, lastEnd);
  return {
    thisMonth,
    lastMonth,
    volumeDeltaPercent: percentDelta(lastMonth.volume, thisMonth.volume),
  };
}

function periodStats(label: string, completed: GymSession[], from: string, to: string) {
  const rows = completed.filter((session) => session.performedOn >= from && session.performedOn <= to);
  const totals = setTotals(rows);
  const averageWeight = totals.sets === 0 ? 0 : roundHalfUp(totals.weightSum / totals.sets, 2);
  return { label, volume: sessionVolume(rows), sessions: rows.length, averageWeight };
}

function setTotals(sessions: GymSession[]): { weightSum: number; repsSum: number; sets: number } {
  let weightSum = 0;
  let repsSum = 0;
  let sets = 0;
  for (const session of sessions) {
    for (const lift of session.lifts) {
      for (const set of lift.sets) {
        weightSum += set.weightKg;
        repsSum += set.reps;
        sets += 1;
      }
    }
  }
  return { weightSum, repsSum, sets };
}

function trendDirection(newestFirst: SessionSnapshot[]): ExerciseStats['trend']['direction'] {
  if (newestFirst.length < 2) {
    return 'insufficient';
  }
  const chronological = [...newestFirst].reverse();
  const recentCount = Math.min(3, chronological.length);
  let recent = chronological.slice(chronological.length - recentCount);
  let older = chronological.slice(0, chronological.length - recentCount);
  if (!older.length) {
    older = chronological.slice(0, chronological.length - 1);
    recent = chronological.slice(chronological.length - 1);
  }
  const delta = averageMax(recent) - averageMax(older);
  if (delta >= TREND_THRESHOLD_KG) {
    return 'up';
  }
  if (delta <= -TREND_THRESHOLD_KG) {
    return 'down';
  }
  return 'stable';
}

function averageMax(sessions: SessionSnapshot[]): number {
  const sum = sessions.reduce((total, session) => total + session.maxWeightKg, 0);
  return roundHalfUp(sum / sessions.length, 4);
}

function better(current: BestPerformance | null, date: string, set: VisitSet, setIndex: number): BestPerformance {
  const candidate: BestPerformance = { date, weightKg: set.weightKg, reps: set.reps, setIndex };
  if (!current) {
    return candidate;
  }
  if (candidate.weightKg !== current.weightKg) {
    return candidate.weightKg > current.weightKg ? candidate : current;
  }
  if (candidate.reps !== current.reps) {
    return candidate.reps > current.reps ? candidate : current;
  }
  return candidate.date > current.date ? candidate : current;
}

function normalized(weight: number): number {
  return parseFloat(toPlain(weight));
}

function snapshotFrom(visits: Visit[]) {
  let heaviest = 0;
  let mostReps = 0;
  let volume = 0;
  let oneRepMax = 0;
  const repsAtWeight = new Map<number, number>();
  for (const visit of visits) {
    const visitVol = visitVolume(visit.sets);
    if (visitVol > volume) {
      volume = visitVol;
    }
    for (const set of visit.sets) {
      if (set.weightKg > heaviest) {
        heaviest = set.weightKg;
      }
      if (set.reps > mostReps) {
        mostReps = set.reps;
      }
      const e1rm = estimatedOneRepMax(set.weightKg, set.reps);
      if (e1rm > oneRepMax) {
        oneRepMax = e1rm;
      }
      const key = normalized(set.weightKg);
      const prev = repsAtWeight.get(key) ?? 0;
      if (set.reps > prev) {
        repsAtWeight.set(key, set.reps);
      }
    }
  }
  return { heaviest, mostReps, volume, oneRepMax, repsAtWeight };
}

function hit(
  exercise: { id: number; name: string },
  type: string,
  label: string,
  previousValue: number | null,
  currentValue: number,
  detail: string,
  date: string,
): PersonalRecordHit {
  return {
    type,
    label,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    previousValue,
    currentValue,
    detail,
    date,
  };
}
