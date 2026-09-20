import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Toast } from '../../core/toast';
import { messageFrom } from '../../core/format';
import { Exercise, WorkoutTemplate } from '../../core/models';
import { TPipe } from '../../shared/t-pipe';
import { t } from '../../core/i18n';

@Component({
  selector: 'app-templates',
  imports: [ReactiveFormsModule, RouterLink, TPipe],
  templateUrl: './templates.html',
})
export class TemplatesPage implements OnInit {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(Toast);
  private readonly router = inject(Router);

  readonly templates = signal<WorkoutTemplate[]>([]);
  readonly exercises = signal<Exercise[]>([]);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly showForm = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    notes: [''],
    exercises: this.fb.array([this.itemGroup()]),
  });

  get items(): FormArray {
    return this.form.controls.exercises;
  }

  ngOnInit() {
    this.api.listExercises().subscribe({
      next: (rows) => this.exercises.set(rows),
      error: (err) => this.error.set(messageFrom(err)),
    });
    this.reload();
  }

  reload() {
    this.api.listTemplates().subscribe({
      next: (rows) => this.templates.set(rows),
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  startCreate() {
    this.editingId.set(null);
    this.form.reset({ name: '', notes: '' });
    this.items.clear();
    this.items.push(this.itemGroup());
    this.showForm.set(true);
  }

  startEdit(template: WorkoutTemplate) {
    this.editingId.set(template.id);
    this.form.controls.name.setValue(template.name);
    this.form.controls.notes.setValue(template.notes ?? '');
    this.items.clear();
    for (const item of template.exercises) {
      this.items.push(this.itemGroup(item.exerciseId, item.targetSets, item.targetReps, item.targetWeightKg));
    }
    this.showForm.set(true);
  }

  addItem() {
    this.items.push(this.itemGroup());
  }

  removeItem(index: number) {
    if (this.items.length === 1) {
      return;
    }
    this.items.removeAt(index);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name.trim(),
      notes: raw.notes.trim() || null,
      exercises: raw.exercises.map((item) => ({
        exerciseId: Number(item.exerciseId),
        targetSets: Number(item.targetSets),
        targetReps: Number(item.targetReps),
        targetWeightKg: Number(item.targetWeightKg),
      })),
    };
    const id = this.editingId();
    const request = id ? this.api.updateTemplate(id, body) : this.api.createTemplate(body);
    request.subscribe({
      next: () => {
        this.showForm.set(false);
        this.toast.show(id ? t('toast.templateUpdated') : t('toast.templateSaved'));
        this.reload();
      },
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  startWorkout(id: number) {
    this.router.navigate(['/log'], { queryParams: { template: id } });
  }

  remove(id: number) {
    this.api.deleteTemplate(id).subscribe({
      next: () => {
        this.toast.show(t('toast.templateDeleted'));
        this.reload();
      },
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  private itemGroup(exerciseId = 0, sets = 3, reps = 8, weight = 40) {
    return this.fb.nonNullable.group({
      exerciseId: [exerciseId || (this.exercises()[0]?.id ?? 0), Validators.required],
      targetSets: [sets, [Validators.required, Validators.min(1)]],
      targetReps: [reps, [Validators.required, Validators.min(1)]],
      targetWeightKg: [weight, [Validators.required, Validators.min(0.5)]],
    });
  }
}
