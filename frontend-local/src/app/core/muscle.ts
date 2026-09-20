import { t } from './i18n';
import { Exercise, MuscleGroup } from './models';

export const MUSCLE_GROUPS: MuscleGroup[] = ['CHEST', 'BACK', 'SHOULDERS', 'LEGS', 'ARMS', 'CORE', 'OTHER'];

export type MuscleSection = {
  group: MuscleGroup;
  label: string;
  items: Exercise[];
};

export function muscleLabel(group: string | null | undefined): string {
  const value = (group || 'OTHER').toUpperCase();
  return t(`muscle.${value}`);
}

export function muscleChipClass(group: string | null | undefined): string {
  switch ((group || 'OTHER').toUpperCase()) {
    case 'CHEST':
      return 'muscle-chest';
    case 'BACK':
      return 'muscle-back';
    case 'SHOULDERS':
      return 'muscle-shoulders';
    case 'LEGS':
      return 'muscle-legs';
    case 'ARMS':
      return 'muscle-arms';
    case 'CORE':
      return 'muscle-core';
    default:
      return 'muscle-other';
  }
}

export function presentMuscleGroups(exercises: Exercise[]): MuscleGroup[] {
  const present = new Set(exercises.map((exercise) => (exercise.muscleGroup || 'OTHER') as MuscleGroup));
  return MUSCLE_GROUPS.filter((group) => present.has(group));
}

export function groupExercises(
  exercises: Exercise[],
  query = '',
  filter: MuscleGroup | 'ALL' = 'ALL',
): MuscleSection[] {
  const q = query.trim().toLowerCase();
  const rows = exercises.filter((exercise) => {
    const group = (exercise.muscleGroup || 'OTHER') as MuscleGroup;
    if (filter !== 'ALL' && group !== filter) {
      return false;
    }
    if (!q) {
      return true;
    }
    return exercise.name.toLowerCase().includes(q);
  });
  return MUSCLE_GROUPS.map((group) => ({
    group,
    label: muscleLabel(group),
    items: rows.filter((exercise) => (exercise.muscleGroup || 'OTHER') === group),
  })).filter((section) => section.items.length > 0);
}
