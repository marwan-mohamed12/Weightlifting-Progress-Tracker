import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Toast } from '../../core/toast';
import { messageFrom } from '../../core/format';
import {
  MUSCLE_GROUPS,
  groupExercises,
  muscleChipClass,
  muscleLabel,
  presentMuscleGroups,
} from '../../core/muscle';
import { Exercise, MuscleGroup } from '../../core/models';
import { ConfirmDialog } from '../../shared/confirm';
import { Icon } from '../../shared/icon';
import { TPipe } from '../../shared/t-pipe';
import { t } from '../../core/i18n';

@Component({
  selector: 'app-exercises',
  imports: [ReactiveFormsModule, ConfirmDialog, RouterLink, NgClass, Icon, TPipe],
  templateUrl: './exercises.html',
})
export class ExercisesPage implements OnInit {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(Toast);

  readonly exercises = signal<Exercise[]>([]);
  readonly query = signal('');
  readonly groupFilter = signal<MuscleGroup | 'ALL'>('ALL');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly showForm = signal(false);
  readonly pendingDelete = signal<Exercise | null>(null);

  readonly groups = MUSCLE_GROUPS;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    notes: ['', Validators.maxLength(1000)],
    muscleGroup: ['OTHER'],
  });

  readonly filters = computed(() => presentMuscleGroups(this.exercises()));

  readonly sections = computed(() => groupExercises(this.exercises(), this.query(), this.groupFilter()));

  readonly matchCount = computed(() => this.sections().reduce((sum, section) => sum + section.items.length, 0));

  readonly muscleLabel = muscleLabel;

  muscleChip(group: MuscleGroup | string | null | undefined): string {
    return muscleChipClass(group);
  }

  setGroup(group: MuscleGroup | 'ALL') {
    this.groupFilter.set(group);
  }

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.api.listExercises().subscribe({
      next: (rows) => {
        this.exercises.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(messageFrom(err));
        this.loading.set(false);
      },
    });
  }

  startCreate() {
    this.editingId.set(null);
    const group = this.groupFilter();
    this.form.reset({ name: '', notes: '', muscleGroup: group === 'ALL' ? 'OTHER' : group });
    this.showForm.set(true);
  }

  startEdit(exercise: Exercise) {
    this.editingId.set(exercise.id);
    this.form.reset({ name: exercise.name, notes: exercise.notes ?? '', muscleGroup: exercise.muscleGroup ?? 'OTHER' });
    this.showForm.set(true);
  }

  cancel() {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = {
      name: this.form.controls.name.value.trim(),
      notes: this.form.controls.notes.value.trim() || null,
      muscleGroup: this.form.controls.muscleGroup.value,
    };
    const id = this.editingId();
    const request = id ? this.api.updateExercise(id, body) : this.api.createExercise(body);
    request.subscribe({
      next: () => {
        this.showForm.set(false);
        this.editingId.set(null);
        this.toast.show(id ? t('toast.exerciseUpdated') : t('toast.exerciseSaved'));
        this.reload();
      },
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  toggleFavorite(exercise: Exercise) {
    this.api.toggleFavorite(exercise.id).subscribe({
      next: () => this.reload(),
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  askDelete(exercise: Exercise) {
    this.pendingDelete.set(exercise);
  }

  cancelDelete() {
    this.pendingDelete.set(null);
  }

  confirmDelete() {
    const exercise = this.pendingDelete();
    this.pendingDelete.set(null);
    if (!exercise) {
      return;
    }
    this.api.deleteExercise(exercise.id).subscribe({
      next: () => {
        this.toast.show(t('toast.exerciseDeleted'));
        this.reload();
      },
      error: (err) => this.error.set(messageFrom(err)),
    });
  }
}
