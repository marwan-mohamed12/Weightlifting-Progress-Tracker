import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Toast } from '../../core/toast';
import { messageFrom, todayIso } from '../../core/format';
import { Exercise, GymSession, PersonalRecordHit, SessionWrite } from '../../core/models';
import { ConfirmDialog } from '../../shared/confirm';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-log',
  imports: [ReactiveFormsModule, RouterLink, ConfirmDialog, Icon],
  templateUrl: './log.html',
})
export class LogPage implements OnInit {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  readonly exercises = signal<Exercise[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly sessionId = signal<number | null>(null);
  readonly status = signal<'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');
  readonly confirmOpen = signal(false);
  readonly pickerOpen = signal(false);
  readonly pickerQuery = signal('');
  readonly records = signal<PersonalRecordHit[]>([]);
  readonly notifyPrs = signal(true);

  readonly form = this.fb.nonNullable.group({
    performedOn: [todayIso(), Validators.required],
    notes: [''],
    lifts: this.fb.array<FormGroup>([]),
  });

  get lifts(): FormArray<FormGroup> {
    return this.form.controls.lifts;
  }

  filteredExercises(): Exercise[] {
    const q = this.pickerQuery().trim().toLowerCase();
    const used = new Set(this.lifts.controls.map((g) => Number(g.get('exerciseId')?.value)));
    return this.exercises().filter((exercise) => {
      if (used.has(exercise.id)) {
        return false;
      }
      return !q || exercise.name.toLowerCase().includes(q);
    });
  }

  ngOnInit() {
    this.api.getSettings().subscribe({
      next: (settings) => this.notifyPrs.set(settings.notifyPersonalRecords),
      error: () => undefined,
    });
    this.api.listExercises().subscribe({
      next: (rows) => this.exercises.set(rows),
      error: (err) => this.error.set(messageFrom(err)),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadSession(Number(idParam));
      return;
    }
    const templateId = this.route.snapshot.queryParamMap.get('template');
    this.api.activeSession().subscribe({
      next: (active) => {
        if (active) {
          this.router.navigate(['/log', active.id], { replaceUrl: true });
          return;
        }
        const start$ = templateId
          ? this.api.startFromTemplate(Number(templateId), todayIso())
          : this.api.startSession(todayIso());
        start$.subscribe({
          next: (created) => this.router.navigate(['/log', created.id], { replaceUrl: true }),
          error: (err) => {
            this.error.set(messageFrom(err));
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(messageFrom(err));
        this.loading.set(false);
      },
    });
  }

  liftSets(index: number): FormArray {
    return this.lifts.at(index).get('sets') as FormArray;
  }

  exerciseName(id: number): string {
    return this.exercises().find((exercise) => exercise.id === id)?.name ?? 'Exercise';
  }

  addExercise(id: number) {
    this.lifts.push(this.liftGroup(id, [{ weightKg: 40, reps: 8 }]));
    this.pickerOpen.set(false);
    this.pickerQuery.set('');
  }

  addSet(liftIndex: number) {
    const sets = this.liftSets(liftIndex);
    const last = sets.at(sets.length - 1)?.getRawValue() ?? { weightKg: 40, reps: 8 };
    sets.push(this.setGroup(last.weightKg, last.reps));
  }

  removeSet(liftIndex: number, setIndex: number) {
    const sets = this.liftSets(liftIndex);
    if (sets.length === 1) {
      return;
    }
    sets.removeAt(setIndex);
  }

  removeLift(index: number) {
    this.lifts.removeAt(index);
  }

  bumpWeight(liftIndex: number, setIndex: number, delta: number) {
    const control = this.liftSets(liftIndex).at(setIndex).get('weightKg');
    const next = Math.min(1000, Math.max(0.5, roundToStep(Number(control?.value ?? 40) + delta, 0.5)));
    control?.setValue(next);
  }

  bumpReps(liftIndex: number, setIndex: number, delta: number) {
    const control = this.liftSets(liftIndex).at(setIndex).get('reps');
    const next = Math.min(500, Math.max(1, Number(control?.value ?? 1) + delta));
    control?.setValue(next);
  }

  saveDraft() {
    this.persist('save');
  }

  finish() {
    this.persist('finish');
  }

  askDelete() {
    this.confirmOpen.set(true);
  }

  confirmDelete() {
    const id = this.sessionId();
    this.confirmOpen.set(false);
    if (!id) {
      return;
    }
    this.api.deleteSession(id).subscribe({
      next: () => {
        this.toast.show('Workout deleted');
        this.router.navigateByUrl('/');
      },
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  private persist(mode: 'save' | 'finish') {
    const id = this.sessionId();
    if (!id) {
      return;
    }
    if (this.lifts.length === 0 && mode === 'finish') {
      this.error.set('Add at least one exercise before finishing.');
      return;
    }
    const body = this.toBody();
    this.saving.set(true);
    this.error.set(null);
    if (mode === 'finish') {
      this.api.finishSession(id, body).subscribe({
        next: (finish) => {
          this.saving.set(false);
          this.status.set('COMPLETED');
          const hits = this.notifyPrs() ? finish.personalRecords : [];
          this.records.set(hits);
          this.toast.show(hits.length ? `${hits.length} personal record${hits.length === 1 ? '' : 's'}` : 'Workout finished');
          if (hits.length === 0) {
            this.router.navigateByUrl('/');
          }
        },
        error: (err: unknown) => {
          this.error.set(messageFrom(err));
          this.saving.set(false);
        },
      });
      return;
    }
    this.api.saveSession(id, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.show('Workout saved');
        this.router.navigateByUrl('/');
      },
      error: (err: unknown) => {
        this.error.set(messageFrom(err));
        this.saving.set(false);
      },
    });
  }

  dismissRecords() {
    this.records.set([]);
    this.router.navigateByUrl('/');
  }

  private loadSession(id: number) {
    this.sessionId.set(id);
    this.api.getSession(id).subscribe({
      next: (session) => {
        this.status.set(session.status);
        this.form.controls.performedOn.setValue(session.performedOn);
        this.form.controls.notes.setValue(session.notes ?? '');
        this.lifts.clear();
        for (const lift of session.lifts) {
          this.lifts.push(
            this.liftGroup(
              lift.exerciseId,
              lift.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps })),
            ),
          );
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(messageFrom(err));
        this.loading.set(false);
      },
    });
  }

  private toBody(): SessionWrite {
    const raw = this.form.getRawValue();
    return {
      performedOn: raw.performedOn,
      notes: raw.notes.trim() ? raw.notes.trim() : null,
      lifts: raw.lifts.map((lift) => ({
        exerciseId: Number(lift['exerciseId']),
        sets: (lift['sets'] as { weightKg: number; reps: number }[]).map((set) => ({
          weightKg: set.weightKg,
          reps: set.reps,
        })),
      })),
    };
  }

  private liftGroup(exerciseId: number, sets: { weightKg: number; reps: number }[]) {
    return this.fb.nonNullable.group({
      exerciseId: [exerciseId, Validators.required],
      sets: this.fb.array(sets.map((set) => this.setGroup(set.weightKg, set.reps))),
    });
  }

  private setGroup(weightKg: number, reps: number) {
    return this.fb.nonNullable.group({
      weightKg: [weightKg, [Validators.required, Validators.min(0.01)]],
      reps: [reps, [Validators.required, Validators.min(1)]],
    });
  }
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}
