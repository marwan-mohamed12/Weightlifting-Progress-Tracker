package com.weightlifting.tracker.workout;

import com.weightlifting.tracker.exercise.Exercise;
import com.weightlifting.tracker.exercise.ExerciseService;
import com.weightlifting.tracker.shared.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class WorkoutService {

    private final WorkoutRepository workoutRepository;
    private final ExerciseService exerciseService;

    public WorkoutService(WorkoutRepository workoutRepository, ExerciseService exerciseService) {
        this.workoutRepository = workoutRepository;
        this.exerciseService = exerciseService;
    }

    @Transactional(readOnly = true)
    public List<WorkoutResponse> list(Long exerciseId, LocalDate from, LocalDate to) {
        return workoutRepository.search(exerciseId, from, to).stream()
                .map(WorkoutResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkoutResponse get(Long id) {
        return WorkoutResponse.from(require(id));
    }

    @Transactional
    public WorkoutResponse create(WorkoutRequest request) {
        Exercise exercise = exerciseService.require(request.exerciseId());
        Workout workout = new Workout(exercise, request.performedOn(), normalizeNotes(request.notes()));
        workout.replaceSets(toSets(request.sets()));
        return WorkoutResponse.from(workoutRepository.save(workout));
    }

    @Transactional
    public WorkoutResponse update(Long id, WorkoutRequest request) {
        Workout workout = require(id);
        Exercise exercise = exerciseService.require(request.exerciseId());
        workout.setExercise(exercise);
        workout.setPerformedOn(request.performedOn());
        workout.setNotes(normalizeNotes(request.notes()));
        workout.replaceSets(toSets(request.sets()));
        return WorkoutResponse.from(workout);
    }

    @Transactional
    public void delete(Long id) {
        Workout workout = require(id);
        workoutRepository.delete(workout);
    }

    @Transactional(readOnly = true)
    public Workout require(Long id) {
        return workoutRepository.findDetailedById(id)
                .orElseThrow(() -> new NotFoundException("Workout " + id + " was not found."));
    }

    private static List<WorkoutSet> toSets(List<SetRequest> requests) {
        return requests.stream()
                .map(set -> new WorkoutSet(set.weightKg(), set.reps()))
                .toList();
    }

    private static String normalizeNotes(String notes) {
        if (notes == null) {
            return null;
        }
        String trimmed = notes.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
