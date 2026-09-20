export type MuscleGroup = 'CHEST' | 'BACK' | 'SHOULDERS' | 'LEGS' | 'ARMS' | 'CORE' | 'OTHER';

export interface Exercise {
  id: number;
  name: string;
  notes: string | null;
  muscleGroup: MuscleGroup;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseWrite {
  name: string;
  notes?: string | null;
  muscleGroup?: MuscleGroup | string;
}

export interface WorkoutSet {
  id: number;
  setIndex: number;
  weightKg: number;
  reps: number;
}

export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface SessionLift {
  id: number;
  exerciseId: number;
  exerciseName: string;
  notes: string | null;
  summary: string;
  volume: number;
  sets: WorkoutSet[];
}

export interface GymSession {
  id: number;
  performedOn: string;
  status: SessionStatus;
  notes: string | null;
  bodyWeightKg: number | null;
  summary: string;
  exerciseCount: number;
  setCount: number;
  lifts: SessionLift[];
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface SessionWrite {
  performedOn: string;
  notes?: string | null;
  bodyWeightKg?: number | null;
  status?: SessionStatus;
  lifts: {
    exerciseId: number;
    notes?: string | null;
    sets: { weightKg: number; reps: number }[];
  }[];
}

export interface PersonalRecordHit {
  type: string;
  label: string;
  exerciseId: number;
  exerciseName: string;
  previousValue: number | null;
  currentValue: number;
  detail: string;
  date: string | null;
}

export interface FinishResponse {
  session: GymSession;
  personalRecords: PersonalRecordHit[];
}

export interface BestPerformance {
  date: string;
  weightKg: number;
  reps: number;
  setIndex: number;
}

export interface SessionSnapshot {
  date: string;
  maxWeightKg: number;
  totalReps: number;
  totalVolume: number;
}

export interface WeightFrequency {
  weightKg: number;
  setCount: number;
  totalReps: number;
  sessionCount: number;
}

export interface PersonalRecords {
  heaviestWeightKg: number | null;
  mostRepsInOneSet: number | null;
  highestVolume: number | null;
  estimatedOneRepMax: number | null;
  mostRepsAtWeight: { weightKg: number; reps: number }[];
}

export interface ExerciseStats {
  exerciseId: number;
  exerciseName: string;
  currentWeightKg: number | null;
  highestWeightKg: number | null;
  highestReps: number | null;
  totalSets: number;
  totalReps: number;
  sessionCount: number;
  lifetimeVolume: number;
  bestPerformance: BestPerformance | null;
  personalRecords: PersonalRecords;
  trend: {
    direction: 'up' | 'down' | 'stable' | 'insufficient';
    sessions: SessionSnapshot[];
  };
  weightFrequency: WeightFrequency[];
  lastBodyWeightKg: number | null;
  bestPerBodyWeight: number | null;
}

export interface AppSettings {
  notifyPersonalRecords: boolean;
  restTimerSeconds: number;
  lastBodyWeightKg: number | null;
}

export interface ProgressOverview {
  range: string;
  from: string | null;
  to: string;
  weeklyVolume: number;
  monthlyVolume: number;
  weeklyFrequency: number;
  averageWeight: number;
  averageReps: number;
  progressPercent: number;
  currentVolume: number;
  previousVolume: number;
  volumeByMuscle: { name: string; volume: number }[];
  exerciseFrequency: { exerciseId: number; name: string; sessions: number }[];
  comparison: {
    thisMonth: { label: string; volume: number; sessions: number; averageWeight: number };
    lastMonth: { label: string; volume: number; sessions: number; averageWeight: number };
    volumeDeltaPercent: number;
  };
  prTimeline: PersonalRecordHit[];
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  notes: string | null;
  exercises: {
    id: number;
    exerciseId: number;
    exerciseName: string;
    targetSets: number;
    targetReps: number;
    targetWeightKg: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateWrite {
  name: string;
  notes?: string | null;
  exercises: {
    exerciseId: number;
    targetSets: number;
    targetReps: number;
    targetWeightKg: number;
  }[];
}

export interface ImportResult {
  exercises: number;
  sessions: number;
  templates: number;
  warnings: string[];
}

export interface ApiErrorBody {
  error: string;
  message: string;
}
