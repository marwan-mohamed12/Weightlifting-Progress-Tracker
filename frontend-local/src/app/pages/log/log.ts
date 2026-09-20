import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Toast } from '../../core/toast';
import { messageFrom, todayIso } from '../../core/format';
import { groupExercises, muscleLabel, presentMuscleGroups } from '../../core/muscle';
import { AppSettings, Exercise, MuscleGroup, PersonalRecordHit, SessionWrite } from '../../core/models';
import { RestTimer } from '../../core/rest-timer';
import { ConfirmDialog } from '../../shared/confirm';
import { Icon } from '../../shared/icon';
import { TPipe } from '../../shared/t-pipe';
import { t } from '../../core/i18n';

@Component({
  selector: 'app-log',
  imports: [ReactiveFormsModule, RouterLink, ConfirmDialog, Icon, TPipe],
  templateUrl: './log.html',
})
export class LogPage implements OnInit {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);
  readonly timer = inject(RestTimer);
  private readonly pickerSearch = viewChild<ElementRef<HTMLInputElement>>('pickerSearch');

  readonly exercises = signal<Exercise[]>([]);
  readonly restSeconds = signal(90);
  readonly restChoices = [0, 60, 90, 120, 180];
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly sessionId = signal<number | null>(null);
  readonly status = signal<'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');
  readonly confirmOpen = signal(false);
  readonly pickerOpen = signal(false);
  readonly pickerQuery = signal('');
  readonly pickerGroup = signal<MuscleGroup | 'ALL'>('ALL');
  readonly muscleLabel = muscleLabel;
  readonly records = signal<PersonalRecordHit[]>([]);
  readonly notifyPrs = signal(true);

  readonly form = this.fb.nonNullable.group({
    performedOn: [todayIso(), Validators.required],
    notes: [''],
    bodyWeightKg: [''],
    lifts: this.fb.array<FormGroup>([]),
  });

  get lifts(): FormArray<FormGroup> {
    return this.form.controls.lifts;
  }

  unusedExercises(): Exercise[] {
    const used = new Set(this.lifts.controls.map((group) => Number(group.get('exerciseId')?.value)));
    return this.exercises().filter((exercise) => !used.has(exercise.id));
  }

  pickerFilters(): MuscleGroup[] {
    return presentMuscleGroups(this.unusedExercises());
  }

  pickerSections() {
    const favorites = this.pickerFavorites();
    const favoriteIds = new Set(favorites.map((row) => row.id));
    return groupExercises(
      this.unusedExercises().filter((exercise) => !favoriteIds.has(exercise.id)),
      this.pickerQuery(),
      this.pickerGroup(),
    );
  }

  pickerFavorites(): Exercise[] {
    const q = this.pickerQuery().trim().toLowerCase();
    const group = this.pickerGroup();
    return this.unusedExercises().filter((exercise) => {
      if (!exercise.favorite) {
        return false;
      }
      if (group !== 'ALL' && exercise.muscleGroup !== group) {
        return false;
      }
      return !q || exercise.name.toLowerCase().includes(q);
    });
  }

  ngOnInit() {
    this.api.getSettings().subscribe({
      next: (settings) => {
        this.notifyPrs.set(settings.notifyPersonalRecords);
        this.restSeconds.set(settings.restTimerSeconds ?? 90);
        if (settings.lastBodyWeightKg && !this.form.controls.bodyWeightKg.value) {
          this.form.controls.bodyWeightKg.setValue(String(settings.lastBodyWeightKg));
        }
      },
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

  openPicker() {
    this.pickerQuery.set('');
    this.pickerGroup.set('ALL');
    this.pickerOpen.set(true);
    window.setTimeout(() => this.pickerSearch()?.nativeElement.focus(), 0);
  }

  addExercise(id: number) {
    this.api.lastSetForExercise(id).subscribe({
      next: (last) => {
        this.lifts.push(this.liftGroup(id, [{ weightKg: last?.weightKg ?? 40, reps: last?.reps ?? 8 }]));
        this.closePicker();
      },
      error: () => {
        this.lifts.push(this.liftGroup(id, [{ weightKg: 40, reps: 8 }]));
        this.closePicker();
      },
    });
  }

  closePicker() {
    this.pickerOpen.set(false);
    this.pickerQuery.set('');
    this.pickerGroup.set('ALL');
  }

  toggleFavorite(id: number, event: Event) {
    event.stopPropagation();
    this.api.toggleFavorite(id).subscribe({
      next: (updated) => {
        this.exercises.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      },
      error: (err) => this.error.set(messageFrom(err)),
    });
  }

  addSet(liftIndex: number) {
    const sets = this.liftSets(liftIndex);
    const last = sets.at(sets.length - 1)?.getRawValue() ?? { weightKg: 40, reps: 8 };
    sets.push(this.setGroup(last.weightKg, last.reps));
  }

  logSet(liftIndex: number) {
    this.addSet(liftIndex);
    const seconds = this.restSeconds();
    if (seconds > 0) {
      this.timer.start(seconds);
    }
  }

  setRest(seconds: number) {
    this.restSeconds.set(seconds);
    this.api
      .updateSettings({
        notifyPersonalRecords: this.notifyPrs(),
        restTimerSeconds: seconds,
      } as AppSettings)
      .subscribe({ error: () => undefined });
  }

  restClock(_remaining: number): string {
    return this.timer.label();
  }

  restLabel(seconds: number): string {
    if (seconds === 0) {
      return t('log.restOff');
    }
    const minutes = Math.floor(seconds / 60);
    const leftover = seconds % 60;
    return leftover ? `${minutes}:${String(leftover).padStart(2, '0')}` : `${minutes}:00`;
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
        this.toast.show(t('toast.workoutDeleted'));
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
      this.error.set(t('log.needExercise'));
      return;
    }
    this.timer.skip();
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
          this.toast.show(
            hits.length
              ? hits.length === 1
                ? t('toast.prOne')
                : t('toast.prs', { count: hits.length })
              : t('toast.workoutFinished'),
          );
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
        this.toast.show(t('toast.workoutSaved'));
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
        this.form.controls.bodyWeightKg.setValue(session.bodyWeightKg ? String(session.bodyWeightKg) : '');
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
    const bwRaw = String(raw.bodyWeightKg ?? '').trim();
    const bodyWeightKg = bwRaw ? Number(bwRaw) : null;
    return {
      performedOn: raw.performedOn,
      notes: raw.notes.trim() ? raw.notes.trim() : null,
      bodyWeightKg: bodyWeightKg && bodyWeightKg > 0 ? bodyWeightKg : null,
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
